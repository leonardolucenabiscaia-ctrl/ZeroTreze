import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { criarNotificacao, enviarWhatsAppNotificacao } from "./notificacoes.service";
import { mapMulta } from "./mappers";
import { paginarTodasAsLinhas } from "./pagination";
import type { Multa } from "@/lib/types";

export async function listarMultas(): Promise<Multa[]> {
  const supabase = createAdminClient();
  const linhas = await paginarTodasAsLinhas((inicio, fim) =>
    supabase.from("multas").select("*").order("data", { ascending: false }).range(inicio, fim)
  );
  return linhas.map(mapMulta);
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

/** Só faz sentido aplicar desconto ou dar baixa manual sobre multas ainda não pagas. */
function podeReceberAcaoAdministrativa(multa: { situacao: string }): boolean {
  return multa.situacao !== "paga";
}

export interface DescontoMultaInput {
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

/** Aplica (ou remove, se ambas as formas vierem vazias) um desconto administrativo sobre uma
 * multa ainda não paga — mesmo esquema já usado nas parcelas de acordo. */
export async function aplicarDescontoMulta(
  multaId: string,
  desconto: DescontoMultaInput,
  usuarioNome: string
): Promise<Multa> {
  const supabase = createAdminClient();
  const { data: multa } = await supabase.from("multas").select("*").eq("id", multaId).maybeSingle();
  if (!multa) throw new Error("Multa não encontrada");
  if (!podeReceberAcaoAdministrativa(multa)) throw new Error("Esta multa já está paga.");
  if (desconto.percentual !== undefined && (desconto.percentual < 0 || desconto.percentual > 100)) {
    throw new Error("O percentual de desconto deve estar entre 0 e 100.");
  }
  if (desconto.valorFixo !== undefined && desconto.valorFixo < 0) {
    throw new Error("O valor de desconto não pode ser negativo.");
  }

  const semDesconto = !desconto.percentual && !desconto.valorFixo;
  if (!semDesconto && !desconto.motivo?.trim()) {
    throw new Error("Explique o motivo do desconto — o cliente também vai ver essa explicação.");
  }

  const patch = semDesconto
    ? {
        desconto_percentual: null,
        desconto_valor_fixo: null,
        desconto_aplicado_por_nome: null,
        desconto_aplicado_em: null,
        desconto_motivo: null,
      }
    : {
        desconto_percentual: desconto.percentual || null,
        desconto_valor_fixo: desconto.valorFixo || null,
        desconto_aplicado_por_nome: usuarioNome,
        desconto_aplicado_em: new Date().toISOString(),
        desconto_motivo: desconto.motivo!.trim(),
      };

  const { data: atualizada, error } = await supabase
    .from("multas")
    .update(patch)
    .eq("id", multaId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível aplicar o desconto.");

  if (!semDesconto) {
    const { data: contrato } = await supabase
      .from("contratos")
      .select("cliente_id")
      .eq("id", multa.contrato_id as string)
      .maybeSingle();
    const cliente = contrato
      ? (await supabase.from("clientes").select("usuario_id").eq("id", contrato.cliente_id).maybeSingle()).data
      : null;
    if (cliente) {
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId: cliente.usuario_id,
        tipo: "desconto_parcela_aplicado",
        titulo: "Desconto aplicado",
        mensagem: `Você recebeu um desconto na multa ${atualizada.numero_auto} (${atualizada.descricao}).`,
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/multas",
      });
    }
  }

  return mapMulta(atualizada);
}

export interface BaixaManualMultaInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
  motivo: string;
}

/** Administrador registra que recebeu o pagamento da multa fora do fluxo digital (dinheiro, ou
 * outro meio sem comprovante) e dá baixa direto nela. */
export async function darBaixaManualMulta(
  multaId: string,
  dados: BaixaManualMultaInput,
  usuarioNome: string
): Promise<Multa> {
  const supabase = createAdminClient();
  const { data: multa } = await supabase.from("multas").select("*").eq("id", multaId).maybeSingle();
  if (!multa) throw new Error("Multa não encontrada");
  if (!podeReceberAcaoAdministrativa(multa)) throw new Error("Esta multa já está paga.");
  if (!(dados.valor > 0)) throw new Error("O valor recebido deve ser maior que zero.");
  if (!dados.motivo.trim()) throw new Error("Explique como esse pagamento foi recebido.");

  const agora = new Date().toISOString();
  // O filtro extra `.eq("situacao", multa.situacao)` faz a baixa só valer se a situação ainda for
  // exatamente a que acabamos de ler — evita que um duplo clique dê baixa duas vezes na mesma multa.
  const { data: atualizada, error } = await supabase
    .from("multas")
    .update({
      situacao: "paga",
      forma_pagamento: dados.formaPagamento,
      baixa_manual_valor: dados.valor,
      baixa_manual_por_nome: usuarioNome,
      baixa_manual_em: agora,
      baixa_manual_motivo: dados.motivo.trim(),
    })
    .eq("id", multaId)
    .eq("situacao", multa.situacao)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!atualizada) throw new Error("Esta multa já foi paga por outra ação — recarregue a página.");

  const { data: contrato } = await supabase
    .from("contratos")
    .select("cliente_id")
    .eq("id", multa.contrato_id as string)
    .maybeSingle();
  const cliente = contrato
    ? (await supabase.from("clientes").select("usuario_id").eq("id", contrato.cliente_id).maybeSingle()).data
    : null;
  if (cliente) {
    await criarNotificacao({
      id: crypto.randomUUID(),
      usuarioId: cliente.usuario_id,
      tipo: "pagamento_confirmado",
      titulo: "Multa paga",
      mensagem: `A multa ${atualizada.numero_auto} (${atualizada.descricao}) foi registrada como paga.`,
      lida: false,
      criadoEm: agora,
      link: "/multas",
    });
  }

  return mapMulta(atualizada);
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
