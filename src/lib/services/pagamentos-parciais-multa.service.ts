import type { Documento, PagamentoParcialMulta } from "@/lib/types";
import { apiFetch } from "./api-client";

export interface PagamentoParcialMultaInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
}

/**
 * O cliente envia um pagamento parcial pra uma multa (pode ser o valor cheio ou só uma parte —
 * dá pra ir completando aos poucos). Fica "aguardando_confirmacao" até o administrador conferir
 * o recebimento na conta bancária.
 */
export async function enviarPagamentoParcialMulta(
  multaId: string,
  dados: PagamentoParcialMultaInput,
  anexos: File[]
): Promise<PagamentoParcialMulta> {
  const formData = new FormData();
  formData.append("valor", String(dados.valor));
  formData.append("formaPagamento", dados.formaPagamento);
  anexos.forEach((arquivo) => formData.append("anexos", arquivo));
  return apiFetch<PagamentoParcialMulta>(`/api/financeiro-multas/multas/${multaId}/pagamento-parcial`, {
    method: "POST",
    body: formData,
  });
}

/** Histórico de pagamentos parciais enviados pra uma multa (pendentes, confirmados e recusados). */
export async function listarPagamentosParciaisMultaPorMulta(multaId: string): Promise<PagamentoParcialMulta[]> {
  return apiFetch<PagamentoParcialMulta[]>(`/api/financeiro-multas/pagamentos-parciais?multaId=${multaId}`);
}

/** Fila de conferência do financeiro multas — todos os pagamentos parciais aguardando
 * confirmação. */
export async function listarPagamentosParciaisMultaPendentes(): Promise<PagamentoParcialMulta[]> {
  return apiFetch<PagamentoParcialMulta[]>("/api/financeiro-multas/pagamentos-parciais?pendentes=true");
}

export async function listarComprovantesPorPagamentoParcialMulta(
  pagamentoParcialMultaId: string
): Promise<Documento[]> {
  return apiFetch<Documento[]>(`/api/financeiro-multas/pagamentos-parciais/${pagamentoParcialMultaId}/comprovantes`);
}

/** Administrador confere o recebimento na conta bancária e confirma esse envio específico. */
export async function confirmarPagamentoParcialMulta(
  pagamentoParcialMultaId: string
): Promise<PagamentoParcialMulta> {
  return apiFetch<PagamentoParcialMulta>(
    `/api/financeiro-multas/pagamentos-parciais/${pagamentoParcialMultaId}/confirmar`,
    { method: "POST" }
  );
}

/** Administrador não encontrou esse valor na conta — recusa só esse envio específico. */
export async function recusarPagamentoParcialMulta(
  pagamentoParcialMultaId: string
): Promise<PagamentoParcialMulta> {
  return apiFetch<PagamentoParcialMulta>(
    `/api/financeiro-multas/pagamentos-parciais/${pagamentoParcialMultaId}/recusar`,
    { method: "POST" }
  );
}
