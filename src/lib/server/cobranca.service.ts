import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao } from "./notificacoes.service";
import { mapNotificacaoCobranca, mapRegraCobranca } from "./mappers";
import type { CanalCobranca, DestinatarioCobranca, NotificacaoCobranca, RegraCobranca } from "@/lib/types";

export async function listarRegrasCobranca(): Promise<RegraCobranca[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("regras_cobranca").select("*").order("offset_dias");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRegraCobranca);
}

export async function atualizarRegraCobranca(id: string, dados: Partial<RegraCobranca>): Promise<RegraCobranca> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (dados.offsetDias !== undefined) patch.offset_dias = dados.offsetDias;
  if (dados.canais !== undefined) patch.canais = dados.canais;
  if (dados.mensagem !== undefined) patch.mensagem = dados.mensagem;
  if (dados.ativa !== undefined) patch.ativa = dados.ativa;

  const { data, error } = await supabase.from("regras_cobranca").update(patch).eq("id", id).select().single();
  if (error || !data) throw new Error(error?.message ?? "Regra não encontrada");
  return mapRegraCobranca(data);
}

export async function listarNotificacoesCobranca(): Promise<NotificacaoCobranca[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notificacoes_cobranca")
    .select("*")
    .order("enviado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotificacaoCobranca);
}

export interface NovaNotificacaoCobrancaInput {
  titulo: string;
  descricao: string;
  canais: CanalCobranca[];
  destinatario: DestinatarioCobranca;
  clienteId?: string;
}

/**
 * Cria uma notificação de cobrança avulsa — diferente das regras automáticas por dia de
 * vencimento, é disparada manualmente pelo administrador, para um cliente específico ou para
 * todos os clientes com algum contrato em atraso no momento do envio.
 */
export async function enviarNotificacaoCobranca(
  dados: NovaNotificacaoCobrancaInput,
  usuarioNome: string
): Promise<NotificacaoCobranca> {
  if (dados.canais.length === 0) throw new Error("Selecione ao menos um canal de envio.");

  const supabase = createAdminClient();
  let clientesAlvo: { id: string; nome: string; usuario_id: string }[];
  let clienteNome: string | undefined;

  if (dados.destinatario === "cliente_especifico") {
    if (!dados.clienteId) throw new Error("Selecione o cliente.");
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome, usuario_id")
      .eq("id", dados.clienteId)
      .maybeSingle();
    if (!cliente) throw new Error("Selecione o cliente.");
    clientesAlvo = [cliente];
    clienteNome = cliente.nome;
  } else {
    const { data: contratosAtraso } = await supabase.from("contratos").select("cliente_id").eq("status", "atraso");
    const clienteIds = [...new Set((contratosAtraso ?? []).map((c) => c.cliente_id as string))];
    if (clienteIds.length === 0) throw new Error("Nenhum cliente está em atraso no momento.");
    const { data: clientes } = await supabase.from("clientes").select("id, nome, usuario_id").in("id", clienteIds);
    clientesAlvo = clientes ?? [];
  }

  const agora = new Date().toISOString();
  for (const cliente of clientesAlvo) {
    await criarNotificacao({
      id: crypto.randomUUID(),
      usuarioId: cliente.usuario_id,
      tipo: "cobranca_manual",
      titulo: dados.titulo,
      mensagem: dados.descricao,
      lida: false,
      criadoEm: agora,
      link: "/financeiro",
    });
  }

  const { data: registro, error } = await supabase
    .from("notificacoes_cobranca")
    .insert({
      titulo: dados.titulo,
      descricao: dados.descricao,
      canais: dados.canais,
      destinatario: dados.destinatario,
      cliente_id: dados.clienteId ?? null,
      cliente_nome: clienteNome ?? null,
      clientes_alcancados: clientesAlvo.length,
      enviado_por_nome: usuarioNome,
      enviado_em: agora,
    })
    .select()
    .single();
  if (error || !registro) throw new Error(error?.message ?? "Não foi possível registrar o envio.");

  return mapNotificacaoCobranca(registro);
}
