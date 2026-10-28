import type { TipoManutencao } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarTiposManutencao(): Promise<TipoManutencao[]> {
  return apiFetch<TipoManutencao[]>("/api/tipos-manutencao");
}

export async function criarTipoManutencao(nome: string): Promise<TipoManutencao> {
  return apiFetch<TipoManutencao>("/api/tipos-manutencao", {
    method: "POST",
    body: JSON.stringify({ nome }),
  });
}
