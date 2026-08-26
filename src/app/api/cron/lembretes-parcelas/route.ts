import { NextResponse, type NextRequest } from "next/server";
import { addDays, startOfDay, subDays } from "date-fns";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao, enviarWhatsAppNotificacao } from "@/lib/server/notificacoes.service";
import { formatCurrency } from "@/lib/utils/formatters";
import type { TipoNotificacao } from "@/lib/types";

const FUSO_NEGOCIO = "America/Sao_Paulo";

/** Extrai o dia de calendário (ano/mês/dia) de um instante, no fuso horário do negócio — os
 * clientes (e o navegador deles) enxergam a data das parcelas nesse fuso, mas o servidor da
 * Vercel roda em UTC por padrão. Sem isso, "hoje" e o vencimento da parcela podem cair em dias
 * diferentes dependendo de qual fuso o processo usa, desalinhando em 1 dia as mensagens de
 * "vence hoje"/"venceu ontem" em relação ao que o cliente vê na tela. */
function diaCalendarioNoNegocio(data: Date): { ano: number; mes: number; dia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_NEGOCIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  return {
    ano: Number(partes.find((p) => p.type === "year")!.value),
    mes: Number(partes.find((p) => p.type === "month")!.value),
    dia: Number(partes.find((p) => p.type === "day")!.value),
  };
}

function diferencaEmDiasNoNegocio(referencia: Date, comparada: Date): number {
  const r = diaCalendarioNoNegocio(referencia);
  const c = diaCalendarioNoNegocio(comparada);
  const msReferencia = Date.UTC(r.ano, r.mes - 1, r.dia);
  const msComparada = Date.UTC(c.ano, c.mes - 1, c.dia);
  return Math.round((msReferencia - msComparada) / 86_400_000);
}

function formatarDataNoNegocio(data: Date): string {
  const { ano, mes, dia } = diaCalendarioNoNegocio(data);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

// Vercel Cron: roda 1x por dia (ver vercel.json) — não precisa Vercel Cron pra funcionar em dev,
// mas em produção só a Vercel consegue chamar essa rota de verdade (confere o CRON_SECRET
// abaixo).
export const maxDuration = 60;

interface RegraLembrete {
  offsetDias: number;
  tipo: TipoNotificacao;
  templateEnvVar: string;
  titulo: (dataFormatada: string) => string;
  mensagem: (valorFormatado: string, dataFormatada: string) => string;
}

const REGRAS: RegraLembrete[] = [
  {
    offsetDias: 2,
    tipo: "parcela_falta_2_dias",
    templateEnvVar: "WHATSAPP_TEMPLATE_PARCELA_2DIAS",
    titulo: () => "Parcela vence em 2 dias",
    mensagem: (valor, data) => `Sua parcela de ${valor} vence em 2 dias (${data}).`,
  },
  {
    offsetDias: 0,
    tipo: "parcela_vence_hoje",
    templateEnvVar: "WHATSAPP_TEMPLATE_PARCELA_HOJE",
    titulo: () => "Parcela vence hoje",
    mensagem: (valor, data) => `Sua parcela de ${valor} vence hoje (${data}).`,
  },
  {
    offsetDias: -1,
    tipo: "parcela_venceu_ontem",
    templateEnvVar: "WHATSAPP_TEMPLATE_PARCELA_ONTEM",
    titulo: () => "Parcela venceu ontem",
    mensagem: (valor, data) => `Sua parcela de ${valor} venceu ontem (${data}) e ainda está em aberto.`,
  },
];

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

  for (const parcela of parcelas ?? []) {
    const dataVencimento = new Date(parcela.data_vencimento as string);
    const diffDias = diferencaEmDiasNoNegocio(dataVencimento, hoje);
    const regra = REGRAS.find((r) => r.offsetDias === diffDias);
    if (!regra) continue;

    try {
      const { error: erroDedup } = await supabase
        .from("lembretes_parcela_enviados")
        .insert({ parcela_id: parcela.id, tipo: regra.tipo });
      if (erroDedup) {
        // unique(parcela_id, tipo) violado = já mandamos esse lembrete pra essa parcela antes.
        ignorados++;
        continue;
      }

      const contratoInfo = (parcela as unknown as { contratos: { cliente_id: string } }).contratos;
      const { data: cliente } = await supabase
        .from("clientes")
        .select("usuario_id")
        .eq("id", contratoInfo.cliente_id)
        .maybeSingle();
      if (!cliente) {
        comErro++;
        continue;
      }

      const valorFormatado = formatCurrency(parcela.valor_original as number);
      const dataFormatada = formatarDataNoNegocio(dataVencimento);

      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId: cliente.usuario_id,
        tipo: regra.tipo,
        titulo: regra.titulo(dataFormatada),
        mensagem: regra.mensagem(valorFormatado, dataFormatada),
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/financeiro",
      });
      await enviarWhatsAppNotificacao(cliente.usuario_id, regra.templateEnvVar, [valorFormatado, dataFormatada]);

      enviados++;
    } catch (erro) {
      console.error("[cron:lembretes-parcelas] Falha numa parcela:", parcela.id, erro);
      comErro++;
    }
  }

  return NextResponse.json({ verificadas: parcelas?.length ?? 0, enviados, ignorados, comErro });
}
