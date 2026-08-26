import "server-only";
import { addWeeks } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { competenciaDaSemana } from "@/lib/mock-data/generators/financeiro";
import { mapDocumento, mapMovimentoExtrato, mapParametrosFinanceiros, mapParcela } from "./mappers";
import { criarNotificacao } from "./notificacoes.service";
import type { Documento, MovimentoExtrato, ParametrosFinanceiros, Parcela } from "@/lib/types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export async function obterParametrosFinanceiros(): Promise<ParametrosFinanceiros> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("parametros_financeiros").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("Parâmetros financeiros não configurados.");
  return mapParametrosFinanceiros(data);
}

export async function atualizarParametrosFinanceiros(
  novos: ParametrosFinanceiros
): Promise<ParametrosFinanceiros> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("parametros_financeiros")
    .update({
      percentual_multa: novos.percentualMulta,
      juros_mora_diario_reais: novos.jurosMoraDiarioReais,
      indice_correcao_mensal: novos.indiceCorrecaoMensal,
    })
    .eq("id", 1)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível atualizar os parâmetros.");
  return mapParametrosFinanceiros(data);
}

/** Mesma função pura de sempre — não acessa banco, só calcula. */
export async function calcularParcela(parcela: Parcela): Promise<ReturnType<typeof calcularValorAtualizado>> {
  const parametros = await obterParametrosFinanceiros();
  return calcularValorAtualizado(parcela, parametros);
}

/** Libera a próxima parcela semanal, se o contrato estiver ativo e não houver nenhuma "em_aberto"
 * no momento. Retorna true se uma nova parcela foi criada. */
async function liberarProximaParcelaSeNecessario(supabase: SupabaseAdmin, contratoId: string): Promise<boolean> {
  const { data: contrato } = await supabase.from("contratos").select("*").eq("id", contratoId).maybeSingle();
  if (!contrato || contrato.status === "encerrado") return false;

  const { data: parcelasContrato } = await supabase.from("parcelas").select("*").eq("contrato_id", contratoId);
  if (!parcelasContrato || parcelasContrato.length === 0) return false;
  if (parcelasContrato.some((p) => p.status === "em_aberto")) return false;

  const ultimaParcela = parcelasContrato.reduce((atual, p) => (p.numero > atual.numero ? p : atual));
  const proximoVencimento = addWeeks(new Date(ultimaParcela.data_vencimento as string), 1);

  const { error } = await supabase.from("parcelas").insert({
    id: crypto.randomUUID(),
    contrato_id: contratoId,
    numero: (ultimaParcela.numero as number) + 1,
    competencia: competenciaDaSemana(proximoVencimento),
    valor_original: contrato.valor_parcela,
    data_vencimento: proximoVencimento.toISOString(),
    status: "em_aberto",
  });
  return !error;
}

/** Nenhuma parcela pode continuar "em_aberto" depois que o prazo (segunda 23h59) já passou —
 * como não há um job de servidor rodando o tempo todo, isso é corrigido aqui, sempre que as
 * parcelas de um contrato são consultadas. */
async function sincronizarParcelasVencidasDoContrato(supabase: SupabaseAdmin, contratoId: string) {
  const agora = Date.now();
  for (let i = 0; i < 500; i++) {
    const { data: emAberto } = await supabase
      .from("parcelas")
      .select("*")
      .eq("contrato_id", contratoId)
      .eq("status", "em_aberto")
      .maybeSingle();

    if (emAberto) {
      if (new Date(emAberto.data_vencimento as string).getTime() >= agora) break;
      await supabase.from("parcelas").update({ status: "vencido" }).eq("id", emAberto.id as string);
    }

    if (!(await liberarProximaParcelaSeNecessario(supabase, contratoId))) break;
  }
}

async function sincronizarTodosOsContratos(supabase: SupabaseAdmin) {
  const { data: contratos } = await supabase.from("contratos").select("id").neq("status", "encerrado");
  for (const c of contratos ?? []) {
    await sincronizarParcelasVencidasDoContrato(supabase, c.id as string);
  }
}

export async function listarParcelasPorContrato(contratoId: string): Promise<Parcela[]> {
  const supabase = createAdminClient();
  await sincronizarParcelasVencidasDoContrato(supabase, contratoId);
  const { data, error } = await supabase
    .from("parcelas")
    .select("*")
    .eq("contrato_id", contratoId)
    .order("numero");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapParcela);
}

export interface DescontoParcelaInput {
  descontarMulta: boolean;
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

async function usuarioIdDoContrato(supabase: SupabaseAdmin, contratoId: string): Promise<string | undefined> {
  const { data: contrato } = await supabase.from("contratos").select("cliente_id").eq("id", contratoId).maybeSingle();
  if (!contrato) return undefined;
  const { data: cliente } = await supabase
    .from("clientes")
    .select("usuario_id")
    .eq("id", contrato.cliente_id)
    .maybeSingle();
  return cliente?.usuario_id;
}

/** Aplica (ou remove, se todas as formas vierem vazias) um desconto administrativo sobre uma
 * parcela ainda não paga. */
export async function aplicarDescontoParcela(
  parcelaId: string,
  desconto: DescontoParcelaInput,
  usuarioNome: string
): Promise<Parcela> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase.from("parcelas").select("*").eq("id", parcelaId).maybeSingle();
  if (!parcela) throw new Error("Parcela não encontrada");
  if (parcela.status === "pago") throw new Error("Esta parcela já está paga.");
  if (parcela.status === "aguardando_confirmacao") {
    throw new Error("Esta parcela está aguardando confirmação de pagamento.");
  }
  if (desconto.percentual !== undefined && (desconto.percentual < 0 || desconto.percentual > 100)) {
    throw new Error("O percentual de desconto deve estar entre 0 e 100.");
  }
  if (desconto.valorFixo !== undefined && desconto.valorFixo < 0) {
    throw new Error("O valor de desconto não pode ser negativo.");
  }

  const semDesconto = !desconto.descontarMulta && !desconto.percentual && !desconto.valorFixo;
  if (!semDesconto && !desconto.motivo?.trim()) {
    throw new Error("Explique o motivo do desconto — o cliente também vai ver essa explicação.");
  }

  const patch = semDesconto
    ? {
        desconto_multa: false,
        desconto_percentual: null,
        desconto_valor_fixo: null,
        desconto_aplicado_por_nome: null,
        desconto_aplicado_em: null,
        desconto_motivo: null,
      }
    : {
        desconto_multa: desconto.descontarMulta,
        desconto_percentual: desconto.percentual || null,
        desconto_valor_fixo: desconto.valorFixo || null,
        desconto_aplicado_por_nome: usuarioNome,
        desconto_aplicado_em: new Date().toISOString(),
        desconto_motivo: desconto.motivo!.trim(),
      };

  const { data: atualizada, error } = await supabase
    .from("parcelas")
    .update(patch)
    .eq("id", parcelaId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível aplicar o desconto.");

  if (!semDesconto) {
    const usuarioId = await usuarioIdDoContrato(supabase, parcela.contrato_id as string);
    if (usuarioId) {
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId,
        tipo: "desconto_parcela_aplicado",
        titulo: "Desconto aplicado em uma parcela",
        mensagem: `A parcela ${atualizada.numero} (${atualizada.competencia}) recebeu um desconto. Motivo: ${desconto.motivo!.trim()}`,
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/financeiro",
      });
    }
  }

  return mapParcela(atualizada);
}

export async function listarExtratoPorContrato(contratoId: string): Promise<MovimentoExtrato[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("movimentos_extrato")
    .select("*")
    .eq("contrato_id", contratoId)
    .order("data", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMovimentoExtrato);
}

/** O cliente envia o comprovante de pagamento (anexos opcionais), mas a parcela NÃO é marcada
 * como paga imediatamente — fica "aguardando_confirmacao" até o administrador conferir o
 * recebimento na conta bancária e confirmar manualmente. */
export async function enviarComprovantePagamento(
  parcelaId: string,
  formaPagamento: "pix" | "boleto",
  anexos: File[]
): Promise<Parcela> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase.from("parcelas").select("*").eq("id", parcelaId).maybeSingle();
  if (!parcela) throw new Error("Parcela não encontrada");
  if (parcela.status === "pago") throw new Error("Esta parcela já está paga.");
  if (parcela.status === "aguardando_confirmacao") {
    throw new Error("Esta parcela já está aguardando confirmação do pagamento.");
  }

  const agora = new Date().toISOString();
  const { data: atualizada, error } = await supabase
    .from("parcelas")
    .update({ status: "aguardando_confirmacao", forma_pagamento: formaPagamento, data_envio_comprovante: agora })
    .eq("id", parcelaId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível enviar o comprovante.");

  if (anexos.length > 0) {
    await supabase.from("documentos").insert(
      anexos.map((arquivo) => ({
        contrato_id: parcela.contrato_id,
        parcela_id: parcelaId,
        categoria: "comprovante",
        nome: arquivo.name,
        url: "#",
        tamanho_kb: Math.max(1, Math.round(arquivo.size / 1024)),
        criado_em: agora,
      }))
    );
  }

  return mapParcela(atualizada);
}

/** Fila de conferência do financeiro — parcelas aguardando confirmação de pagamento. */
export async function listarParcelasAguardandoConfirmacao(): Promise<Parcela[]> {
  const supabase = createAdminClient();
  await sincronizarTodosOsContratos(supabase);
  const { data, error } = await supabase
    .from("parcelas")
    .select("*")
    .eq("status", "aguardando_confirmacao")
    .order("data_envio_comprovante");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapParcela);
}

export async function listarComprovantesPorParcela(parcelaId: string): Promise<Documento[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("documentos").select("*").eq("parcela_id", parcelaId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocumento);
}

/** Administrador confirma que o pagamento caiu na conta — só então a parcela vira "pago". */
export async function confirmarPagamento(parcelaId: string): Promise<Parcela> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase.from("parcelas").select("*").eq("id", parcelaId).maybeSingle();
  if (!parcela) throw new Error("Parcela não encontrada");
  if (parcela.status !== "aguardando_confirmacao") {
    throw new Error("Esta parcela não está aguardando confirmação.");
  }

  const parametros = await obterParametrosFinanceiros();
  const valorAtualizado = calcularValorAtualizado(mapParcela(parcela), parametros);
  const dataPagamento = new Date().toISOString();

  const { data: atualizada, error } = await supabase
    .from("parcelas")
    .update({ status: "pago", data_pagamento: dataPagamento })
    .eq("id", parcelaId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível confirmar o pagamento.");

  const { data: ultimoMovimento } = await supabase
    .from("movimentos_extrato")
    .select("saldo")
    .eq("contrato_id", parcela.contrato_id as string)
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();
  const saldoAtual = (ultimoMovimento?.saldo as number | undefined) ?? 0;

  await supabase.from("movimentos_extrato").insert({
    contrato_id: parcela.contrato_id,
    descricao: `Pagamento parcela ${atualizada.numero} — ${atualizada.competencia}`,
    data: dataPagamento,
    tipo: "entrada",
    valor: valorAtualizado.valorFinal,
    saldo: saldoAtual + valorAtualizado.valorFinal,
  });

  // A próxima parcela só é liberada quando o prazo desta vencer (sincronizarParcelasVencidas),
  // não no momento do pagamento — assim nunca existe mais de uma parcela em aberto ao mesmo tempo.

  const usuarioId = await usuarioIdDoContrato(supabase, parcela.contrato_id as string);
  if (usuarioId) {
    await criarNotificacao({
      id: crypto.randomUUID(),
      usuarioId,
      tipo: "pagamento_confirmado",
      titulo: "Pagamento confirmado",
      mensagem: `O pagamento da parcela ${atualizada.numero} (${atualizada.competencia}) foi confirmado.`,
      lida: false,
      criadoEm: new Date().toISOString(),
      link: "/financeiro",
    });
  }

  return mapParcela(atualizada);
}

/** Administrador não encontrou o pagamento na conta — devolve a parcela para cobrança. */
export async function recusarPagamento(parcelaId: string): Promise<Parcela> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase.from("parcelas").select("*").eq("id", parcelaId).maybeSingle();
  if (!parcela) throw new Error("Parcela não encontrada");
  if (parcela.status !== "aguardando_confirmacao") {
    throw new Error("Esta parcela não está aguardando confirmação.");
  }

  const novoStatus =
    new Date(parcela.data_vencimento as string).getTime() < Date.now() ? "vencido" : "em_aberto";

  const { data: atualizada, error } = await supabase
    .from("parcelas")
    .update({ status: novoStatus, data_envio_comprovante: null, forma_pagamento: null })
    .eq("id", parcelaId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível recusar o pagamento.");

  const usuarioId = await usuarioIdDoContrato(supabase, parcela.contrato_id as string);
  if (usuarioId) {
    await criarNotificacao({
      id: crypto.randomUUID(),
      usuarioId,
      tipo: "pagamento_recusado",
      titulo: "Pagamento não confirmado",
      mensagem: `Não conseguimos confirmar o pagamento da parcela ${atualizada.numero} (${atualizada.competencia}). Verifique e tente novamente.`,
      lida: false,
      criadoEm: new Date().toISOString(),
      link: "/financeiro",
    });
  }

  return mapParcela(atualizada);
}
