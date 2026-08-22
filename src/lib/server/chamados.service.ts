import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao, enviarWhatsAppNotificacao } from "./notificacoes.service";
import { mapChamado, mapMensagem } from "./mappers";
import type { CategoriaChamado, Chamado, Mensagem, PrioridadeChamado } from "@/lib/types";

async function anexarMensagensEAvaliacoes(
  supabase: ReturnType<typeof createAdminClient>,
  chamados: Record<string, unknown>[]
): Promise<Chamado[]> {
  if (chamados.length === 0) return [];
  const ids = chamados.map((c) => c.id as string);
  const [{ data: mensagens }, { data: avaliacoes }] = await Promise.all([
    supabase.from("mensagens").select("*").in("chamado_id", ids),
    supabase.from("avaliacoes").select("id, chamado_id").in("chamado_id", ids),
  ]);
  const avaliacaoPorChamado = new Map((avaliacoes ?? []).map((a) => [a.chamado_id as string, a.id as string]));
  return chamados.map((c) =>
    mapChamado(
      c,
      (mensagens ?? []).filter((m) => m.chamado_id === c.id),
      avaliacaoPorChamado.get(c.id as string)
    )
  );
}

export async function listarChamados(): Promise<Chamado[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("chamados").select("*").order("atualizado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return anexarMensagensEAvaliacoes(supabase, data ?? []);
}

export async function listarChamadosPorCliente(clienteId: string): Promise<Chamado[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chamados")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("atualizado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return anexarMensagensEAvaliacoes(supabase, data ?? []);
}

export async function buscarChamadoPorId(id: string): Promise<Chamado | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("chamados").select("*").eq("id", id).maybeSingle();
  if (!data) return undefined;
  const [chamado] = await anexarMensagensEAvaliacoes(supabase, [data]);
  return chamado;
}

export async function criarChamado(dados: {
  clienteId: string;
  clienteNome: string;
  contratoId?: string;
  categoria: CategoriaChamado;
  titulo: string;
  prioridade: PrioridadeChamado;
  mensagemInicial: string;
}): Promise<Chamado> {
  const supabase = createAdminClient();
  const agora = new Date().toISOString();
  const numero = `AT-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: chamadoRow, error } = await supabase
    .from("chamados")
    .insert({
      numero,
      cliente_id: dados.clienteId,
      contrato_id: dados.contratoId ?? null,
      categoria: dados.categoria,
      titulo: dados.titulo,
      status: "aberto",
      prioridade: dados.prioridade,
      criado_em: agora,
      atualizado_em: agora,
    })
    .select()
    .single();
  if (error || !chamadoRow) throw new Error(error?.message ?? "Não foi possível abrir o chamado.");

  const { data: usuarioCliente } = await supabase
    .from("clientes")
    .select("usuario_id")
    .eq("id", dados.clienteId)
    .maybeSingle();

  const { data: mensagemRow, error: mensagemError } = await supabase
    .from("mensagens")
    .insert({
      chamado_id: chamadoRow.id,
      autor_id: usuarioCliente?.usuario_id ?? null,
      autor_nome: dados.clienteNome,
      autor_perfil: "cliente",
      texto: dados.mensagemInicial,
      enviada_em: agora,
      status: "enviada",
    })
    .select()
    .single();
  if (mensagemError || !mensagemRow) throw new Error(mensagemError?.message ?? "Não foi possível enviar a mensagem inicial.");

  return mapChamado(chamadoRow, [mensagemRow]);
}

export async function enviarMensagem(
  chamadoId: string,
  autor: Pick<Mensagem, "autorId" | "autorNome" | "autorPerfil">,
  texto: string
): Promise<Mensagem> {
  const supabase = createAdminClient();
  const { data: chamado } = await supabase.from("chamados").select("*").eq("id", chamadoId).maybeSingle();
  if (!chamado) throw new Error("Chamado não encontrado");

  const agora = new Date().toISOString();
  const { data: mensagemRow, error } = await supabase
    .from("mensagens")
    .insert({
      chamado_id: chamadoId,
      autor_id: autor.autorId,
      autor_nome: autor.autorNome,
      autor_perfil: autor.autorPerfil,
      texto,
      enviada_em: agora,
      status: "enviada",
    })
    .select()
    .single();
  if (error || !mensagemRow) throw new Error(error?.message ?? "Não foi possível enviar a mensagem.");

  const novoStatus = autor.autorPerfil === "cliente" && chamado.status === "resolvido" ? "em_andamento" : chamado.status;
  await supabase.from("chamados").update({ atualizado_em: agora, status: novoStatus }).eq("id", chamadoId);

  if (autor.autorPerfil !== "cliente") {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("usuario_id")
      .eq("id", chamado.cliente_id)
      .maybeSingle();
    if (cliente) {
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId: cliente.usuario_id,
        tipo: "chat_respondido",
        titulo: "Seu chamado foi respondido",
        mensagem: `Chamado ${chamado.numero}: ${autor.autorNome} respondeu sua mensagem.`,
        lida: false,
        criadoEm: agora,
        link: "/atendimento",
      });
      await enviarWhatsAppNotificacao(cliente.usuario_id, "WHATSAPP_TEMPLATE_CHAT_RESPONDIDO", [chamado.numero]);
    }
  }

  return mapMensagem(mensagemRow);
}

export async function atualizarStatusChamado(chamadoId: string, status: Chamado["status"]): Promise<Chamado> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chamados")
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq("id", chamadoId)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Chamado não encontrado");
  const [chamado] = await anexarMensagensEAvaliacoes(supabase, [data]);
  return chamado;
}
