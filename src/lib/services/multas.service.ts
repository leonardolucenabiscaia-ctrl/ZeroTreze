import type { Multa } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarMultas(): Promise<Multa[]> {
  return apiFetch<Multa[]>("/api/multas");
}

export async function listarMultasPorContrato(contratoId: string): Promise<Multa[]> {
  return apiFetch<Multa[]>(`/api/multas?contratoId=${contratoId}`);
}

/** Multas de qualquer contrato do cliente que ainda não tiveram ciência confirmada — enquanto
 * existir ao menos uma, o portal do cliente fica bloqueado (ver `MultaCienciaGate`). */
export async function listarMultasPendentesDeCienciaPorCliente(clienteId: string): Promise<Multa[]> {
  return apiFetch<Multa[]>(`/api/multas?clientePendentesCienciaId=${clienteId}`);
}

/** O cliente confirma que está ciente da multa — registra a data/hora e avisa os administradores. */
export async function confirmarCienciaMulta(multaId: string): Promise<Multa> {
  return apiFetch<Multa>(`/api/multas/${multaId}/confirmar-ciencia`, { method: "POST" });
}

export interface DescontoMultaInput {
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

/** Aplica (ou remove, se ambas as formas vierem vazias) um desconto administrativo sobre uma
 * multa ainda não paga. */
export async function aplicarDescontoMulta(
  multaId: string,
  desconto: DescontoMultaInput,
  usuarioNome: string
): Promise<Multa> {
  return apiFetch<Multa>(`/api/multas/${multaId}/desconto`, {
    method: "POST",
    body: JSON.stringify({ desconto, usuarioNome }),
  });
}

export interface BaixaManualMultaInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
  motivo: string;
}

/** Administrador registra que recebeu o pagamento da multa fora do fluxo digital e dá baixa
 * direto nela. */
export async function darBaixaManualMulta(
  multaId: string,
  dados: BaixaManualMultaInput,
  usuarioNome: string
): Promise<Multa> {
  return apiFetch<Multa>(`/api/multas/${multaId}/baixa-manual`, {
    method: "POST",
    body: JSON.stringify({ dados, usuarioNome }),
  });
}

export interface NovaMultaInput {
  contratoId: string;
  numeroAuto: string;
  orgao: string;
  descricao: string;
  valor: number;
  data: string;
  vencimento: string;
  dataRegistro: string;
  pontos: number;
}

export async function criarMulta(dados: NovaMultaInput): Promise<Multa> {
  return apiFetch<Multa>("/api/multas", { method: "POST", body: JSON.stringify(dados) });
}
