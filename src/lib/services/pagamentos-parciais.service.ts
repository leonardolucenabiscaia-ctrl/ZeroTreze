import type { Documento, PagamentoParcial } from "@/lib/types";
import { apiFetch } from "./api-client";

export interface PagamentoParcialInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
}

/**
 * O cliente envia um pagamento parcial (pode ser o valor cheio da parcela ou só uma parte —
 * dá pra ir completando aos poucos ao longo da semana). Fica "aguardando_confirmacao" até o
 * administrador conferir o recebimento na conta bancária.
 */
export async function enviarPagamentoParcial(
  parcelaId: string,
  dados: PagamentoParcialInput,
  anexos: File[]
): Promise<PagamentoParcial> {
  const formData = new FormData();
  formData.append("valor", String(dados.valor));
  formData.append("formaPagamento", dados.formaPagamento);
  anexos.forEach((arquivo) => formData.append("anexos", arquivo));
  return apiFetch<PagamentoParcial>(`/api/financeiro/parcelas/${parcelaId}/pagamento-parcial`, {
    method: "POST",
    body: formData,
  });
}

/** Histórico de pagamentos parciais enviados pra uma parcela (pendentes, confirmados e recusados). */
export async function listarPagamentosParciaisPorParcela(parcelaId: string): Promise<PagamentoParcial[]> {
  return apiFetch<PagamentoParcial[]>(`/api/financeiro/pagamentos-parciais?parcelaId=${parcelaId}`);
}

/** Fila de conferência do financeiro — todos os pagamentos parciais aguardando confirmação. */
export async function listarPagamentosParciaisPendentes(): Promise<PagamentoParcial[]> {
  return apiFetch<PagamentoParcial[]>("/api/financeiro/pagamentos-parciais?pendentes=true");
}

export async function listarComprovantesPorPagamentoParcial(pagamentoParcialId: string): Promise<Documento[]> {
  return apiFetch<Documento[]>(`/api/financeiro/pagamentos-parciais/${pagamentoParcialId}/comprovantes`);
}

/** Administrador confere o recebimento na conta bancária e confirma esse envio específico. */
export async function confirmarPagamentoParcial(pagamentoParcialId: string): Promise<PagamentoParcial> {
  return apiFetch<PagamentoParcial>(`/api/financeiro/pagamentos-parciais/${pagamentoParcialId}/confirmar`, {
    method: "POST",
  });
}

/** Administrador não encontrou esse valor na conta — recusa só esse envio específico. */
export async function recusarPagamentoParcial(pagamentoParcialId: string): Promise<PagamentoParcial> {
  return apiFetch<PagamentoParcial>(`/api/financeiro/pagamentos-parciais/${pagamentoParcialId}/recusar`, {
    method: "POST",
  });
}
