import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { whatsappProvider } from "@/lib/integrations/whatsapp";
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

/**
 * Manda a mesma notificação também por WhatsApp, usando um template aprovado pela Meta —
 * melhor esforço (nunca lança erro: se o telefone não existir, o template não estiver
 * configurado, ou o envio falhar, só loga e segue). `nomeTemplateEnvVar` é o NOME da variável de
 * ambiente que guarda o nome do template (ex.: "WHATSAPP_TEMPLATE_NOVA_MULTA"), não o template
 * em si — assim o nome real do template pode mudar sem precisar alterar código.
 */
export async function enviarWhatsAppNotificacao(
  usuarioId: string,
  nomeTemplateEnvVar: string,
  parametros: string[]
): Promise<void> {
  const nomeTemplate = process.env[nomeTemplateEnvVar];
  if (!nomeTemplate) {
    console.error(`[notificacoes] ${nomeTemplateEnvVar} não configurado — WhatsApp não enviado.`);
    return;
  }

  try {
    const supabase = createAdminClient();
    const { data: usuario } = await supabase.from("usuarios").select("telefone").eq("id", usuarioId).maybeSingle();
    if (!usuario?.telefone) return;

    const { enviado } = await whatsappProvider.enviarTemplate(usuario.telefone, nomeTemplate, parametros);
    if (!enviado) console.error(`[notificacoes] Falha ao enviar WhatsApp (${nomeTemplateEnvVar}) pro usuário ${usuarioId}.`);
  } catch (erro) {
    console.error(`[notificacoes] Erro ao enviar WhatsApp (${nomeTemplateEnvVar}):`, erro);
  }
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
