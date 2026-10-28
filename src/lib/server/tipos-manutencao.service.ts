import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapTipoManutencao } from "./mappers";
import type { TipoManutencao } from "@/lib/types";

export async function listarTiposManutencao(): Promise<TipoManutencao[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tipos_manutencao").select("*").order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTipoManutencao);
}

/** Cria um tipo novo no catálogo — se já existir um com esse nome (sem diferenciar
 * maiúscula/minúscula), devolve o que já existe em vez de duplicar. */
export async function criarTipoManutencao(nome: string, criadoPorNome: string): Promise<TipoManutencao> {
  const supabase = createAdminClient();
  const nomeTrimado = nome.trim();
  if (!nomeTrimado) throw new Error("Informe o nome do tipo de manutenção.");

  const { data: existente } = await supabase
    .from("tipos_manutencao")
    .select("*")
    .ilike("nome", nomeTrimado)
    .maybeSingle();
  if (existente) return mapTipoManutencao(existente);

  const { data, error } = await supabase
    .from("tipos_manutencao")
    .insert({ nome: nomeTrimado, criado_por_nome: criadoPorNome })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível criar o tipo de manutenção.");
  return mapTipoManutencao(data);
}
