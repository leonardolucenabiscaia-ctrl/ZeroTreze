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
  valorDividaOriginal?: number;
  periodicidade: "semanal" | "mensal";
  descricao?: string;
  anexos?: File[];
  parcelaIds?: string[];
}

export async function criarAcordo(dados: NovoAcordoInput): Promise<Acordo> {
  const formData = new FormData();
  formData.append("clienteId", dados.clienteId);
  formData.append("contratoId", dados.contratoId);
  formData.append("valorEntrada", String(dados.valorEntrada));
  formData.append("valorParcela", String(dados.valorParcela));
  formData.append("quantidadeParcelas", String(dados.quantidadeParcelas));
  formData.append("dataPrimeiraParcela", dados.dataPrimeiraParcela);
  if (dados.valorDividaOriginal !== undefined) {
    formData.append("valorDividaOriginal", String(dados.valorDividaOriginal));
  }
  formData.append("periodicidade", dados.periodicidade);
  if (dados.descricao) formData.append("descricao", dados.descricao);
  if (dados.parcelaIds && dados.parcelaIds.length > 0) {
    formData.append("parcelaIds", JSON.stringify(dados.parcelaIds));
  }
  (dados.anexos ?? []).forEach((arquivo) => formData.append("anexos", arquivo));

  return apiFetch<Acordo>("/api/acordos", { method: "POST", body: formData });
}
