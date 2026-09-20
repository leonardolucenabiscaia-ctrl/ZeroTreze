import type { Documento, ParcelaAcordo } from "@/lib/types";
import { apiFetch } from "./api-client";

/** O cliente envia o comprovante de pagamento (anexos opcionais), mas a parcela do acordo NÃO é
 * marcada como paga imediatamente — fica "aguardando_confirmacao" até o administrador conferir o
 * recebimento na conta bancária e confirmar manualmente. */
export async function enviarComprovantePagamentoAcordo(
  parcelaAcordoId: string,
  formaPagamento: "pix" | "boleto",
  anexos: File[]
): Promise<ParcelaAcordo> {
  const formData = new FormData();
  formData.append("formaPagamento", formaPagamento);
  anexos.forEach((arquivo) => formData.append("anexos", arquivo));
  return apiFetch<ParcelaAcordo>(`/api/financeiro-acordos/parcelas/${parcelaAcordoId}/comprovante`, {
    method: "POST",
    body: formData,
  });
}

export async function listarComprovantesPorParcelaAcordo(parcelaAcordoId: string): Promise<Documento[]> {
  return apiFetch<Documento[]>(`/api/financeiro-acordos/comprovantes?parcelaAcordoId=${parcelaAcordoId}`);
}

/** Administrador confirma que o pagamento caiu na conta — só então a parcela do acordo vira "pago". */
export async function confirmarPagamentoAcordo(parcelaAcordoId: string): Promise<ParcelaAcordo> {
  return apiFetch<ParcelaAcordo>(`/api/financeiro-acordos/parcelas/${parcelaAcordoId}/confirmar`, {
    method: "POST",
  });
}

/** Administrador não encontrou o pagamento na conta — devolve a parcela do acordo para cobrança. */
export async function recusarPagamentoAcordo(parcelaAcordoId: string): Promise<ParcelaAcordo> {
  return apiFetch<ParcelaAcordo>(`/api/financeiro-acordos/parcelas/${parcelaAcordoId}/recusar`, {
    method: "POST",
  });
}

export interface DescontoParcelaAcordoInput {
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

/**
 * Aplica (ou remove, se ambas as formas vierem vazias) um desconto administrativo sobre uma
 * parcela de acordo ainda não paga.
 */
export async function aplicarDescontoParcelaAcordo(
  parcelaAcordoId: string,
  desconto: DescontoParcelaAcordoInput,
  usuarioNome: string
): Promise<ParcelaAcordo> {
  return apiFetch<ParcelaAcordo>(`/api/financeiro-acordos/parcelas/${parcelaAcordoId}/desconto`, {
    method: "POST",
    body: JSON.stringify({ desconto, usuarioNome }),
  });
}

export interface BaixaManualAcordoInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
  motivo: string;
}

/**
 * Administrador registra que recebeu um pagamento fora do fluxo digital (dinheiro, ou outro meio
 * sem comprovante) e dá baixa direto na parcela do acordo — pula o "aguardando_confirmacao".
 */
export async function darBaixaManualAcordo(
  parcelaAcordoId: string,
  dados: BaixaManualAcordoInput,
  usuarioNome: string
): Promise<ParcelaAcordo> {
  return apiFetch<ParcelaAcordo>(`/api/financeiro-acordos/parcelas/${parcelaAcordoId}/baixa-manual`, {
    method: "POST",
    body: JSON.stringify({ dados, usuarioNome }),
  });
}
