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

export async function pagarMulta(multaId: string): Promise<Multa> {
  return apiFetch<Multa>(`/api/multas/${multaId}/pagar`, { method: "POST" });
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
