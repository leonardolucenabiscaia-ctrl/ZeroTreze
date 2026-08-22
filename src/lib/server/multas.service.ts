import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { criarNotificacao, enviarWhatsAppNotificacao } from "./notificacoes.service";
import { mapMulta } from "./mappers";
import type { Multa } from "@/lib/types";

export async function listarMultas(): Promise<Multa[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("multas").select("*").order("data", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMulta);
}

export async function listarMultasPorContrato(contratoId: string): Promise<Multa[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("multas").select("*").eq("contrato_id", contratoId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMulta);
}

/** Multas de qualquer contrato do cliente que ainda não tiveram ciência confirmada — enquanto
 * existir ao menos uma, o portal do cliente fica bloqueado (ver `MultaCienciaGate`). */
export async function listarMultasPendentesDeCienciaPorCliente(clienteId: string): Promise<Multa[]> {
  const supabase = createAdminClient();
  const { data: contratos } = await supabase.from("contratos").select("id").eq("cliente_id", clienteId);
  const contratoIds = (contratos ?? []).map((c) => c.id as string);
  if (contratoIds.length === 0) return [];
  const { data, error } = await supabase
    .from("multas")
    .select("*")
    .in("contrato_id", contratoIds)
    .is("ciencia_em", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMulta);
}

/** O cliente confirma que está ciente da multa — registra a data/hora e avisa os administradores. */
export async function confirmarCienciaMulta(multaId: string): Promise<Multa> {
  const supabase = createAdminClient();
  const { data: multaAtual } = await supabase.from("multas").select("*").eq("id", multaId).maybeSingle();
  if (!multaAtual) throw new Error("Multa não encontrada");
  if (multaAtual.ciencia_em) return mapMulta(multaAtual);

  const cienciaEm = new Date().toISOString();
  const { data: multaAtualizada, error } = await supabase
    .from("multas")
    .update({ ciencia_em: cienciaEm })
    .eq("id", multaId)
    .select()
    .single();
  if (error || !multaAtualizada) throw new Error(error?.message ?? "Não foi possível confirmar a ciência.");

  const { data: contrato } = await supabase
    .from("contratos")
    .select("cliente_id")
    .eq("id", multaAtualizada.contrato_id)
    .maybeSingle();
  const cliente = contrato
    ? (await supabase.from("clientes").select("nome").eq("id", contrato.cliente_id).maybeSingle()).data
    : null;

  const { data: administradores } = await supabase
    .from("usuarios")
    .select("id")
    .eq("perfil", "administrador");

  for (const admin of administradores ?? []) {
    await criarNotificacao({
      id: crypto.randomUUID(),
      usuarioId: admin.id,
      tipo: "multa_ciencia_confirmada",
      titulo: "Cliente confirmou ciência de multa",
      mensagem: `${cliente?.nome ?? "O cliente"} confirmou ciência da multa ${multaAtualizada.numero_auto} (${multaAtualizada.descricao}) em ${formatDateTime(cienciaEm)}.`,
      lida: false,
      criadoEm: new Date().toISOString(),
      link: "/admin/multas",
    });
  }

  return mapMulta(multaAtualizada);
}

export async function pagarMulta(multaId: string): Promise<Multa> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("multas")
    .update({ situacao: "paga" })
    .eq("id", multaId)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Multa não encontrada");
  return mapMulta(data);
}

export interface NovaMultaInput {
  contratoId: string;
  numeroAuto: string;
  orgao: string;
  descricao: string;
  valor: number;
  data: string;
  vencimento: string;
  dataRegistro: string;
  pontos: number;
}

export async function criarMulta(dados: NovaMultaInput): Promise<Multa> {
  const supabase = createAdminClient();

  const { data: contrato } = await supabase
    .from("contratos")
    .select("cliente_id")
    .eq("id", dados.contratoId)
    .maybeSingle();
  if (!contrato) throw new Error("Contrato não encontrado");

  const { data: multaRow, error } = await supabase
    .from("multas")
    .insert({
      contrato_id: dados.contratoId,
      numero_auto: dados.numeroAuto,
      orgao: dados.orgao,
      data: dados.data,
      descricao: dados.descricao,
      valor: dados.valor,
      vencimento: dados.vencimento,
      situacao: "pendente",
      pontos: dados.pontos,
      data_registro: dados.dataRegistro,
    })
    .select()
    .single();
  if (error || !multaRow) throw new Error(error?.message ?? "Não foi possível criar a multa.");

  const { data: cliente } = await supabase
    .from("clientes")
    .select("usuario_id")
    .eq("id", contrato.cliente_id)
    .maybeSingle();
  if (cliente) {
    await criarNotificacao({
      id: crypto.randomUUID(),
      usuarioId: cliente.usuario_id,
      tipo: "nova_multa",
      titulo: "Nova multa registrada",
      mensagem: `Uma nova multa (${dados.descricao}) foi registrada no seu contrato, no valor de ${formatCurrency(dados.valor)}.`,
      lida: false,
      criadoEm: new Date().toISOString(),
      link: "/multas",
    });
    await enviarWhatsAppNotificacao(cliente.usuario_id, "WHATSAPP_TEMPLATE_NOVA_MULTA", [
      dados.descricao,
      formatCurrency(dados.valor),
    ]);
  }

  return mapMulta(multaRow);
}
