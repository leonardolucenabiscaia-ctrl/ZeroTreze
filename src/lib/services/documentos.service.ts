import type { CategoriaDocumento, Documento } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarDocumentosPorCliente(
  clienteId: string,
  categoria?: CategoriaDocumento
): Promise<Documento[]> {
  const query = categoria ? `?clienteId=${clienteId}&categoria=${categoria}` : `?clienteId=${clienteId}`;
  return apiFetch<Documento[]>(`/api/documentos${query}`);
}

export async function listarDocumentos(): Promise<Documento[]> {
  return apiFetch<Documento[]>("/api/documentos");
}
