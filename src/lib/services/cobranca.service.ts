import type { CanalCobranca, DestinatarioCobranca, NotificacaoCobranca, RegraCobranca } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarRegrasCobranca(): Promise<RegraCobranca[]> {
  return apiFetch<RegraCobranca[]>("/api/cobranca/regras");
}

export async function atualizarRegraCobranca(id: string, dados: Partial<RegraCobranca>): Promise<RegraCobranca> {
  return apiFetch<RegraCobranca>(`/api/cobranca/regras/${id}`, { method: "PATCH", body: JSON.stringify(dados) });
}

export async function listarNotificacoesCobranca(): Promise<NotificacaoCobranca[]> {
  return apiFetch<NotificacaoCobranca[]>("/api/cobranca/notificacoes");
}

export interface NovaNotificacaoCobrancaInput {
  titulo: string;
  descricao: string;
  canais: CanalCobranca[];
  destinatario: DestinatarioCobranca;
  /** Obrigatório quando `destinatario` é "cliente_especifico". */
  clienteId?: string;
}

/**
 * Cria uma notificação de cobrança avulsa — diferente das regras automáticas por dia de
 * vencimento, é disparada manualmente pelo administrador, para um cliente específico ou para
 * todos os clientes com algum contrato em atraso no momento do envio.
 */
export async function enviarNotificacaoCobranca(
  dados: NovaNotificacaoCobrancaInput,
  usuarioNome: string
): Promise<NotificacaoCobranca> {
  return apiFetch<NotificacaoCobranca>("/api/cobranca/notificacoes", {
    method: "POST",
    body: JSON.stringify({ dados, usuarioNome }),
  });
}
