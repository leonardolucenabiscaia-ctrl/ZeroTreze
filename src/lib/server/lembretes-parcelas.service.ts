import "server-only";
import { differenceInCalendarDays } from "date-fns";
import crypto from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao, enviarWhatsAppNotificacao } from "./notificacoes.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { TipoNotificacao } from "@/lib/types";

export interface RegraLembrete {
  offsetDias: number;
  tipo: TipoNotificacao;
  templateEnvVar: string;
  titulo: (dataFormatada: string) => string;
  mensagem: (valorFormatado: string, dataFormatada: string) => string;
}

export const REGRAS_LEMBRETE_PARCELA: RegraLembrete[] = [
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

export interface ParcelaComContrato {
  id: string;
  valor_original: number;
  data_vencimento: string;
  contrato_id: string;
  contratos: { cliente_id: string };
}

export type ResultadoLembrete =
  | "enviado"
  | "ignorado_fora_da_janela"
  | "ignorado_ja_enviado"
  | "erro_cliente_nao_encontrado";

/** Processa uma única parcela: acha a regra (2 dias antes / vence hoje / venceu ontem) pela
 * diferença de dias até o vencimento, evita duplicidade via `lembretes_parcela_enviados`
 * (unique em parcela_id+tipo) e dispara notificação in-app + WhatsApp. */
export async function processarLembreteDeParcela(
  supabase: ReturnType<typeof createAdminClient>,
  parcela: ParcelaComContrato
): Promise<ResultadoLembrete> {
  const hoje = new Date();
  const diffDias = differenceInCalendarDays(new Date(parcela.data_vencimento), hoje);
  const regra = REGRAS_LEMBRETE_PARCELA.find((r) => r.offsetDias === diffDias);
  if (!regra) return "ignorado_fora_da_janela";

  const { error: erroDedup } = await supabase
    .from("lembretes_parcela_enviados")
    .insert({ parcela_id: parcela.id, tipo: regra.tipo });
  if (erroDedup) return "ignorado_ja_enviado";

  const { data: cliente } = await supabase
    .from("clientes")
    .select("usuario_id")
    .eq("id", parcela.contratos.cliente_id)
    .maybeSingle();
  if (!cliente) return "erro_cliente_nao_encontrado";

  const valorFormatado = formatCurrency(parcela.valor_original);
  const dataFormatada = formatDate(parcela.data_vencimento);

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

  return "enviado";
}
