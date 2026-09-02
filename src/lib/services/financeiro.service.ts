import type { Documento, MovimentoExtrato, ParametrosFinanceiros, Parcela } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function obterParametrosFinanceiros(): Promise<ParametrosFinanceiros> {
  return apiFetch<ParametrosFinanceiros>("/api/financeiro/parametros");
}

export async function atualizarParametrosFinanceiros(
  novos: ParametrosFinanceiros
): Promise<ParametrosFinanceiros> {
  return apiFetch<ParametrosFinanceiros>("/api/financeiro/parametros", {
    method: "PATCH",
    body: JSON.stringify(novos),
  });
}

export async function listarParcelasPorContrato(contratoId: string): Promise<Parcela[]> {
  return apiFetch<Parcela[]>(`/api/financeiro/parcelas?contratoId=${contratoId}`);
}

export interface DescontoParcelaInput {
  descontarMulta: boolean;
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

/**
 * Aplica (ou remove, se todas as formas vierem vazias) um desconto administrativo sobre uma
 * parcela ainda não paga — a multa por atraso, um percentual e/ou um valor fixo podem ser
 * combinados livremente.
 */
export async function aplicarDescontoParcela(
  parcelaId: string,
  desconto: DescontoParcelaInput,
  usuarioNome: string
): Promise<Parcela> {
  return apiFetch<Parcela>(`/api/financeiro/parcelas/${parcelaId}/desconto`, {
    method: "POST",
    body: JSON.stringify({ desconto, usuarioNome }),
  });
}

export async function listarExtratoPorContrato(contratoId: string): Promise<MovimentoExtrato[]> {
  return apiFetch<MovimentoExtrato[]>(`/api/financeiro/extrato?contratoId=${contratoId}`);
}

/**
 * O cliente envia o comprovante de pagamento (anexos opcionais), mas a parcela NÃO é
 * marcada como paga imediatamente — fica "aguardando_confirmacao" até o administrador
 * conferir o recebimento na conta bancária e confirmar manualmente.
 */
export async function enviarComprovantePagamento(
  parcelaId: string,
  formaPagamento: "pix" | "boleto",
  anexos: File[]
): Promise<Parcela> {
  const formData = new FormData();
  formData.append("formaPagamento", formaPagamento);
  anexos.forEach((arquivo) => formData.append("anexos", arquivo));
  return apiFetch<Parcela>(`/api/financeiro/parcelas/${parcelaId}/comprovante`, {
    method: "POST",
    body: formData,
  });
}

/** Lista as parcelas aguardando confirmação de pagamento (fila de conferência do financeiro). */
export async function listarParcelasAguardandoConfirmacao(): Promise<Parcela[]> {
  return apiFetch<Parcela[]>("/api/financeiro/parcelas?aguardandoConfirmacao=true");
}

export async function listarComprovantesPorParcela(parcelaId: string): Promise<Documento[]> {
  return apiFetch<Documento[]>(`/api/financeiro/comprovantes?parcelaId=${parcelaId}`);
}

/** Administrador confirma que o pagamento caiu na conta — só então a parcela vira "pago". */
export async function confirmarPagamento(parcelaId: string): Promise<Parcela> {
  return apiFetch<Parcela>(`/api/financeiro/parcelas/${parcelaId}/confirmar`, { method: "POST" });
}

/** Administrador não encontrou o pagamento na conta — devolve a parcela para cobrança. */
export async function recusarPagamento(parcelaId: string): Promise<Parcela> {
  return apiFetch<Parcela>(`/api/financeiro/parcelas/${parcelaId}/recusar`, { method: "POST" });
}
