import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapScore } from "./mappers";
import type { ScoreLocatario } from "@/lib/types";

async function anexarHistorico(
  supabase: ReturnType<typeof createAdminClient>,
  scores: Record<string, unknown>[]
): Promise<ScoreLocatario[]> {
  if (scores.length === 0) return [];
  const ids = scores.map((s) => s.id as string);
  const { data: historico } = await supabase.from("historico_score").select("*").in("score_id", ids);
  return scores.map((s) => mapScore(s, (historico ?? []).filter((h) => h.score_id === s.id)));
}

export async function buscarScorePorCliente(clienteId: string): Promise<ScoreLocatario | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("scores").select("*").eq("cliente_id", clienteId).maybeSingle();
  if (!data) return undefined;
  const [score] = await anexarHistorico(supabase, [data]);
  return score;
}

export async function listarScores(): Promise<ScoreLocatario[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("scores").select("*");
  if (error) throw new Error(error.message);
  return anexarHistorico(supabase, data ?? []);
}
