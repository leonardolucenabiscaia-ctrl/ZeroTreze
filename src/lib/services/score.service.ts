import type { ScoreLocatario } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function buscarScorePorCliente(clienteId: string): Promise<ScoreLocatario | undefined> {
  return apiFetch<ScoreLocatario | null>(`/api/scores?clienteId=${clienteId}`).then((v) => v ?? undefined);
}

export async function listarScores(): Promise<ScoreLocatario[]> {
  return apiFetch<ScoreLocatario[]>("/api/scores");
}
