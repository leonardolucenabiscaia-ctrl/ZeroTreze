import type { CategoriaDocumento, Documento } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarDocumentosPorCliente(
  clienteId: string,
  categoria?: CategoriaDocumento
): Promise<Documento[]> {
  const query = categoria ? `?clienteId=${clienteId}&categoria=${categoria}` : `?clienteId=${clienteId}`;
  return apiFetch<Documento[]>(`/api/documentos${query}`);
}

export async function listarDocumentosPorVeiculo(veiculoId: string): Promise<Documento[]> {
  return apiFetch<Documento[]>(`/api/documentos?veiculoId=${veiculoId}`);
}

export async function listarDocumentos(): Promise<Documento[]> {
  return apiFetch<Documento[]>("/api/documentos");
}

/** Pede um link temporário pro arquivo de verdade e abre numa nova aba — o link em si nunca é
 * guardado (expira em poucos minutos), então sempre busca um novo na hora do clique. */
export async function abrirDocumento(documentoId: string): Promise<void> {
  const { url } = await apiFetch<{ url: string }>(`/api/documentos/${documentoId}/abrir`);
  window.open(url, "_blank", "noopener,noreferrer");
}
