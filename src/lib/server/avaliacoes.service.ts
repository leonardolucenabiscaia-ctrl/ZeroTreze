import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapAvaliacao } from "./mappers";
import type { Avaliacao } from "@/lib/types";

export async function criarAvaliacao(dados: Omit<Avaliacao, "id" | "criadaEm">): Promise<Avaliacao> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("avaliacoes")
    .insert({
      chamado_id: dados.chamadoId,
      cliente_id: dados.clienteId,
      nota_atendimento: dados.notaAtendimento,
      nota_tempo: dados.notaTempo,
      nota_qualidade: dados.notaQualidade,
      nota_educacao: dados.notaEducacao,
      nota_resolucao: dados.notaResolucao,
      comentario: dados.comentario ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível registrar a avaliação.");
  return mapAvaliacao(data);
}
