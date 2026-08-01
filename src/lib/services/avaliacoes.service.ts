import type { Avaliacao } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function criarAvaliacao(dados: Omit<Avaliacao, "id" | "criadaEm">): Promise<Avaliacao> {
  return apiFetch<Avaliacao>("/api/avaliacoes", { method: "POST", body: JSON.stringify(dados) });
}
