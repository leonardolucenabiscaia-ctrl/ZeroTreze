import type { Documento, ParcelaAcordo } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarComprovantesPorParcelaAcordo(parcelaAcordoId: string): Promise<Documento[]> {
  return apiFetch<Documento[]>(`/api/financeiro-acordos/comprovantes?parcelaAcordoId=${parcelaAcordoId}`);
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
