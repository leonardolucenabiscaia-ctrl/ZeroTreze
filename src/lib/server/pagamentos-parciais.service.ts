import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { mapDocumento, mapPagamentoParcial, mapParcela } from "./mappers";
import { criarNotificacao } from "./notificacoes.service";
import { obterParametrosFinanceiros, usuarioIdDoContrato } from "./financeiro.service";
import type { Documento, PagamentoParcial } from "@/lib/types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export interface PagamentoParcialInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
}

/** O locatário envia um pagamento parcial (ex: R$400 de uma parcela de R$750) — fica
 * "aguardando_confirmacao" até o administrador conferir o recebimento na conta bancária. Várias
 * podem existir ao mesmo tempo pra mesma parcela (o cliente pode ir completando aos poucos ao
 * longo da semana); só quando confirmado o valor entra em `parcelas.valor_pago`. */
export async function enviarPagamentoParcial(
  parcelaId: string,
  dados: PagamentoParcialInput,
  anexos: File[]
): Promise<PagamentoParcial> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase.from("parcelas").select("*").eq("id", parcelaId).maybeSingle();
  if (!parcela) throw new Error("Parcela não encontrada");
  if (parcela.status === "pago") throw new Error("Esta parcela já está paga.");
  if (parcela.status === "renegociado") {
    throw new Error("Esta parcela foi renegociada em um acordo — pague-a por lá, em Financeiro Acordos.");
  }
  if (!(dados.valor > 0)) throw new Error("O valor deve ser maior que zero.");

  const parametros = await obterParametrosFinanceiros();
  const atualizado = calcularValorAtualizado(mapParcela(parcela), parametros);

  const { data: pendentes } = await supabase
    .from("pagamentos_parciais")
    .select("valor")
    .eq("parcela_id", parcelaId)
    .eq("status", "aguardando_confirmacao");
  const totalPendente = (pendentes ?? []).reduce((soma, p) => soma + (p.valor as number), 0);
  const saldoDisponivel = atualizado.valorFinal - totalPendente;

  if (dados.valor > saldoDisponivel + 0.01) {
    throw new Error(
      `Esse valor é maior que o saldo em aberto (${saldoDisponivel.toFixed(2)}) — considerando outros envios já aguardando confirmação.`
    );
  }

  const { data: pagamento, error } = await supabase
    .from("pagamentos_parciais")
    .insert({ parcela_id: parcelaId, valor: dados.valor, forma_pagamento: dados.formaPagamento })
    .select()
    .single();
  if (error || !pagamento) throw new Error(error?.message ?? "Não foi possível enviar o pagamento.");

  if (anexos.length > 0) {
    await supabase.from("documentos").insert(
      anexos.map((arquivo) => ({
        contrato_id: parcela.contrato_id,
        parcela_id: parcelaId,
        pagamento_parcial_id: pagamento.id,
        categoria: "comprovante",
        nome: arquivo.name,
        url: "#",
        tamanho_kb: Math.max(1, Math.round(arquivo.size / 1024)),
      }))
    );
  }

  return mapPagamentoParcial(pagamento);
}

export async function listarPagamentosParciaisPorParcela(parcelaId: string): Promise<PagamentoParcial[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pagamentos_parciais")
    .select("*")
    .eq("parcela_id", parcelaId)
    .order("enviado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPagamentoParcial);
}

/** Fila de conferência do financeiro — todos os envios ainda aguardando confirmação, de
 * qualquer parcela. */
export async function listarPagamentosParciaisPendentes(): Promise<PagamentoParcial[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pagamentos_parciais")
    .select("*")
    .eq("status", "aguardando_confirmacao")
    .order("enviado_em", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPagamentoParcial);
}

export async function listarComprovantesPorPagamentoParcial(pagamentoParcialId: string): Promise<Documento[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("pagamento_parcial_id", pagamentoParcialId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocumento);
}

async function buscarPagamentoPendente(supabase: SupabaseAdmin, pagamentoParcialId: string) {
  const { data: pagamento } = await supabase
    .from("pagamentos_parciais")
    .select("*")
    .eq("id", pagamentoParcialId)
    .maybeSingle();
  if (!pagamento) throw new Error("Pagamento não encontrado");
  if (pagamento.status !== "aguardando_confirmacao") {
    throw new Error("Este pagamento não está mais aguardando confirmação.");
  }
  return pagamento;
}

/** Administrador confere o recebimento na conta bancária e confirma esse envio específico — o
 * valor passa a contar pra `parcelas.valor_pago`; se cobrir o valor original, a parcela vira
 * "pago". */
export async function confirmarPagamentoParcial(pagamentoParcialId: string): Promise<PagamentoParcial> {
  const supabase = createAdminClient();
  const pagamento = await buscarPagamentoPendente(supabase, pagamentoParcialId);

  const { data: parcela } = await supabase
    .from("parcelas")
    .select("*")
    .eq("id", pagamento.parcela_id as string)
    .maybeSingle();
  if (!parcela) throw new Error("Parcela não encontrada");

  const agora = new Date().toISOString();
  const novoValorPago = (parcela.valor_pago as number) + (pagamento.valor as number);
  const quitada = novoValorPago >= (parcela.valor_original as number) - 0.01;

  const { error: erroParcela } = await supabase
    .from("parcelas")
    .update(
      quitada
        ? { valor_pago: novoValorPago, status: "pago", data_pagamento: agora }
        : { valor_pago: novoValorPago }
    )
    .eq("id", parcela.id as string);
  if (erroParcela) throw new Error(erroParcela.message);

  const { data: atualizado, error } = await supabase
    .from("pagamentos_parciais")
    .update({ status: "confirmado", confirmado_em: agora })
    .eq("id", pagamentoParcialId)
    .select()
    .single();
  if (error || !atualizado) throw new Error(error?.message ?? "Não foi possível confirmar o pagamento.");

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
    descricao: quitada
      ? `Pagamento parcela ${parcela.numero} — ${parcela.competencia} (quitada)`
      : `Pagamento parcial da parcela ${parcela.numero} — ${parcela.competencia}`,
    data: agora,
    tipo: "entrada",
    valor: pagamento.valor,
    saldo: saldoAtual + (pagamento.valor as number),
  });

  const usuarioId = await usuarioIdDoContrato(supabase, parcela.contrato_id as string);
  if (usuarioId) {
    await criarNotificacao({
      id: crypto.randomUUID(),
      usuarioId,
      tipo: "pagamento_confirmado",
      titulo: "Pagamento confirmado",
      mensagem: quitada
        ? `O pagamento da parcela ${parcela.numero} (${parcela.competencia}) foi confirmado e ela está quitada.`
        : `Recebemos seu pagamento parcial da parcela ${parcela.numero} (${parcela.competencia}). Saldo restante atualizado.`,
      lida: false,
      criadoEm: agora,
      link: "/financeiro",
    });
  }

  return mapPagamentoParcial(atualizado);
}

/** Administrador não encontrou esse valor na conta — recusa só esse envio específico, sem afetar
 * outros pagamentos parciais que continuem aguardando confirmação na mesma parcela. */
export async function recusarPagamentoParcial(pagamentoParcialId: string): Promise<PagamentoParcial> {
  const supabase = createAdminClient();
  const pagamento = await buscarPagamentoPendente(supabase, pagamentoParcialId);

  const { data: atualizado, error } = await supabase
    .from("pagamentos_parciais")
    .update({ status: "recusado" })
    .eq("id", pagamentoParcialId)
    .select()
    .single();
  if (error || !atualizado) throw new Error(error?.message ?? "Não foi possível recusar o pagamento.");

  const { data: parcela } = await supabase
    .from("parcelas")
    .select("numero, competencia, contrato_id")
    .eq("id", pagamento.parcela_id as string)
    .maybeSingle();
  if (parcela) {
    const usuarioId = await usuarioIdDoContrato(supabase, parcela.contrato_id as string);
    if (usuarioId) {
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId,
        tipo: "pagamento_recusado",
        titulo: "Pagamento não confirmado",
        mensagem: `Não conseguimos confirmar um dos pagamentos enviados da parcela ${parcela.numero} (${parcela.competencia}). Verifique e tente novamente.`,
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/financeiro",
      });
    }
  }

  return mapPagamentoParcial(atualizado);
}
