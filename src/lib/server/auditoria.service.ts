import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapLogAuditoria } from "./mappers";
import type { LogAuditoria } from "@/lib/types";

export async function registrarAcao(dados: {
  usuarioId: string;
  usuarioNome: string;
  acao: string;
  entidade: string;
  entidadeId: string;
}): Promise<LogAuditoria> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("auditoria")
    .insert({
      usuario_id: dados.usuarioId,
      usuario_nome: dados.usuarioNome,
      acao: dados.acao,
      entidade: dados.entidade,
      entidade_id: dados.entidadeId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível registrar a auditoria.");
  return mapLogAuditoria(data);
}

export async function listarAuditoria(): Promise<LogAuditoria[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("auditoria")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLogAuditoria);
}
