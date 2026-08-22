import { NextResponse, type NextRequest } from "next/server";
import { differenceInCalendarDays } from "date-fns";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao, enviarWhatsAppNotificacao } from "@/lib/server/notificacoes.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { TipoNotificacao } from "@/lib/types";

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

  const { data: parcelas, error } = await supabase
    .from("parcelas")
    .select("id, valor_original, data_vencimento, contrato_id, contratos!inner(cliente_id, status)")
    .in("status", ["em_aberto", "vencido"])
    .neq("contratos.status", "encerrado");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;
  let ignorados = 0;
  let comErro = 0;

  for (const parcela of parcelas ?? []) {
    const diffDias = differenceInCalendarDays(new Date(parcela.data_vencimento as string), hoje);
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
      const dataFormatada = formatDate(parcela.data_vencimento as string);

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
