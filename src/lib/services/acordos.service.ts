import type { Acordo } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarAcordos(): Promise<Acordo[]> {
  return apiFetch<Acordo[]>("/api/acordos");
}

export async function listarAcordosPorCliente(clienteId: string): Promise<Acordo[]> {
  return apiFetch<Acordo[]>(`/api/acordos?clienteId=${clienteId}`);
}

export async function buscarAcordoPorId(id: string): Promise<Acordo | undefined> {
  return apiFetch<Acordo | null>(`/api/acordos/${id}`).then((v) => v ?? undefined);
}

export interface NovoAcordoInput {
  clienteId: string;
  contratoId: string;
  valorEntrada: number;
  valorParcela: number;
  quantidadeParcelas: number;
  dataPrimeiraParcela: string;
  descricao?: string;
  anexos?: File[];
}

export async function criarAcordo(dados: NovoAcordoInput): Promise<Acordo> {
  const formData = new FormData();
  formData.append("clienteId", dados.clienteId);
  formData.append("contratoId", dados.contratoId);
  formData.append("valorEntrada", String(dados.valorEntrada));
  formData.append("valorParcela", String(dados.valorParcela));
  formData.append("quantidadeParcelas", String(dados.quantidadeParcelas));
  formData.append("dataPrimeiraParcela", dados.dataPrimeiraParcela);
  if (dados.descricao) formData.append("descricao", dados.descricao);
  (dados.anexos ?? []).forEach((arquivo) => formData.append("anexos", arquivo));

  return apiFetch<Acordo>("/api/acordos", { method: "POST", body: formData });
}
