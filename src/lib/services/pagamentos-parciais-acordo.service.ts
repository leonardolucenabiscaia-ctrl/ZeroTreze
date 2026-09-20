import type { Documento, PagamentoParcialAcordo } from "@/lib/types";
import { apiFetch } from "./api-client";

export interface PagamentoParcialAcordoInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
}

/**
 * O cliente envia um pagamento parcial pra uma parcela de acordo (pode ser o valor cheio ou só
 * uma parte — dá pra ir completando aos poucos ao longo da semana). Fica "aguardando_confirmacao"
 * até o administrador conferir o recebimento na conta bancária.
 */
export async function enviarPagamentoParcialAcordo(
  parcelaAcordoId: string,
  dados: PagamentoParcialAcordoInput,
  anexos: File[]
): Promise<PagamentoParcialAcordo> {
  const formData = new FormData();
  formData.append("valor", String(dados.valor));
  formData.append("formaPagamento", dados.formaPagamento);
  anexos.forEach((arquivo) => formData.append("anexos", arquivo));
  return apiFetch<PagamentoParcialAcordo>(`/api/financeiro-acordos/parcelas/${parcelaAcordoId}/pagamento-parcial`, {
    method: "POST",
    body: formData,
  });
}

/** Histórico de pagamentos parciais enviados pra uma parcela de acordo (pendentes, confirmados e
 * recusados). */
export async function listarPagamentosParciaisAcordoPorParcela(
  parcelaAcordoId: string
): Promise<PagamentoParcialAcordo[]> {
  return apiFetch<PagamentoParcialAcordo[]>(
    `/api/financeiro-acordos/pagamentos-parciais?parcelaAcordoId=${parcelaAcordoId}`
  );
}

/** Fila de conferência do financeiro acordos — todos os pagamentos parciais aguardando
 * confirmação. */
export async function listarPagamentosParciaisAcordoPendentes(): Promise<PagamentoParcialAcordo[]> {
  return apiFetch<PagamentoParcialAcordo[]>("/api/financeiro-acordos/pagamentos-parciais?pendentes=true");
}

export async function listarComprovantesPorPagamentoParcialAcordo(
  pagamentoParcialAcordoId: string
): Promise<Documento[]> {
  return apiFetch<Documento[]>(`/api/financeiro-acordos/pagamentos-parciais/${pagamentoParcialAcordoId}/comprovantes`);
}

/** Administrador confere o recebimento na conta bancária e confirma esse envio específico. */
export async function confirmarPagamentoParcialAcordo(
  pagamentoParcialAcordoId: string
): Promise<PagamentoParcialAcordo> {
  return apiFetch<PagamentoParcialAcordo>(
    `/api/financeiro-acordos/pagamentos-parciais/${pagamentoParcialAcordoId}/confirmar`,
    { method: "POST" }
  );
}

/** Administrador não encontrou esse valor na conta — recusa só esse envio específico. */
export async function recusarPagamentoParcialAcordo(
  pagamentoParcialAcordoId: string
): Promise<PagamentoParcialAcordo> {
  return apiFetch<PagamentoParcialAcordo>(
    `/api/financeiro-acordos/pagamentos-parciais/${pagamentoParcialAcordoId}/recusar`,
    { method: "POST" }
  );
}
