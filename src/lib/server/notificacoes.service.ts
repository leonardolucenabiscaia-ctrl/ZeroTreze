import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapNotificacao } from "./mappers";
import type { Notificacao } from "@/lib/types";

const CONTATO_SUPORTE = "Caso tenha alguma dúvida, contatar (13) 97809-6805.";

export async function criarNotificacao(notificacao: Notificacao): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notificacoes").insert({
    id: notificacao.id,
    usuario_id: notificacao.usuarioId,
    tipo: notificacao.tipo,
    titulo: notificacao.titulo,
    mensagem: `${notificacao.mensagem} ${CONTATO_SUPORTE}`,
    lida: notificacao.lida,
    criado_em: notificacao.criadoEm,
    link: notificacao.link ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listarNotificacoesPorUsuario(usuarioId: string): Promise<Notificacao[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotificacao);
}

export async function marcarComoLida(notificacaoId: string): Promise<Notificacao> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", notificacaoId)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Notificação não encontrada");
  return mapNotificacao(data);
}

export async function marcarTodasComoLidas(usuarioId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("usuario_id", usuarioId);
  if (error) throw new Error(error.message);
}
