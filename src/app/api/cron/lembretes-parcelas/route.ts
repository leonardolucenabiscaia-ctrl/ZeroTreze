import { NextResponse, type NextRequest } from "next/server";
import { addDays, startOfDay, subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { processarLembreteDeParcela, type ParcelaComContrato } from "@/lib/server/lembretes-parcelas.service";

// Vercel Cron: roda 1x por dia (ver vercel.json) — não precisa Vercel Cron pra funcionar em dev,
// mas em produção só a Vercel consegue chamar essa rota de verdade (confere o CRON_SECRET
// abaixo).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const autorizacao = request.headers.get("authorization");
    if (autorizacao !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const hoje = new Date();

  // A janela de datas relevante é só [hoje-1, hoje+2] (as 3 regras cobrem esse intervalo) — com
  // margem de 1 dia de folga pra não cortar nada por fuso horário. Filtrar por data direto na
  // consulta evita esbarrar no limite padrão de 1000 linhas do Supabase (o total de parcelas do
  // banco inteiro passa disso).
  const inicioJanela = startOfDay(subDays(hoje, 2)).toISOString();
  const fimJanela = startOfDay(addDays(hoje, 4)).toISOString();

  const { data: parcelas, error } = await supabase
    .from("parcelas")
    .select("id, valor_original, data_vencimento, contrato_id, contratos!inner(cliente_id, status)")
    .in("status", ["em_aberto", "vencido"])
    .neq("contratos.status", "encerrado")
    .gte("data_vencimento", inicioJanela)
    .lte("data_vencimento", fimJanela);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;
  let ignorados = 0;
  let comErro = 0;

  for (const parcela of (parcelas ?? []) as unknown as ParcelaComContrato[]) {
    try {
      const resultado = await processarLembreteDeParcela(supabase, parcela);
      if (resultado === "enviado") enviados++;
      else if (resultado === "ignorado_fora_da_janela" || resultado === "ignorado_ja_enviado") ignorados++;
      else comErro++;
    } catch (erro) {
      console.error("[cron:lembretes-parcelas] Falha numa parcela:", parcela.id, erro);
      comErro++;
    }
  }

  return NextResponse.json({ verificadas: parcelas?.length ?? 0, enviados, ignorados, comErro });
}
