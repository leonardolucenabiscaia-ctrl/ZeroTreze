import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { calcularValorAtualizadoMulta } from "@/lib/calculations/multa";
import { mapDocumento, mapMulta, mapPagamentoParcialMulta } from "./mappers";
import { criarNotificacao } from "./notificacoes.service";
import { usuarioIdDoContrato } from "./financeiro.service";
import type { Documento, PagamentoParcialMulta } from "@/lib/types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export interface PagamentoParcialMultaInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
}

/** O locatário envia um pagamento parcial pra uma multa — mesmo esquema das parcelas de
 * contrato/acordo: fica "aguardando_confirmacao" até o administrador conferir o recebimento na
 * conta bancária, e pode mandar quantos envios quiser; só quando confirmado o valor entra em
 * `multas.valor_pago`. */
export async function enviarPagamentoParcialMulta(
  multaId: string,
  dados: PagamentoParcialMultaInput,
  anexos: File[]
): Promise<PagamentoParcialMulta> {
  const supabase = createAdminClient();
  const { data: multa } = await supabase.from("multas").select("*").eq("id", multaId).maybeSingle();
  if (!multa) throw new Error("Multa não encontrada");
  if (multa.situacao === "paga") throw new Error("Esta multa já está paga.");
  if (!(dados.valor > 0)) throw new Error("O valor deve ser maior que zero.");
  if (anexos.length === 0) throw new Error("Anexe o comprovante de pagamento.");

  const saldo = calcularValorAtualizadoMulta(mapMulta(multa));

  const { data: pendentes } = await supabase
    .from("pagamentos_parciais_multa")
    .select("valor")
    .eq("multa_id", multaId)
    .eq("status", "aguardando_confirmacao");
  const totalPendente = (pendentes ?? []).reduce((soma, p) => soma + (p.valor as number), 0);
  const saldoDisponivel = saldo - totalPendente;

  if (dados.valor > saldoDisponivel + 0.01) {
    throw new Error(
      `Esse valor é maior que o saldo em aberto (${saldoDisponivel.toFixed(2)}) — considerando outros envios já aguardando confirmação.`
    );
  }

  const { data: pagamento, error } = await supabase
    .from("pagamentos_parciais_multa")
    .insert({ multa_id: multaId, valor: dados.valor, forma_pagamento: dados.formaPagamento })
    .select()
    .single();
  if (error || !pagamento) throw new Error(error?.message ?? "Não foi possível enviar o pagamento.");

  if (anexos.length > 0) {
    await supabase.from("documentos").insert(
      anexos.map((arquivo) => ({
        contrato_id: multa.contrato_id,
        pagamento_parcial_multa_id: pagamento.id,
        categoria: "comprovante",
        nome: arquivo.name,
        url: "#",
        tamanho_kb: Math.max(1, Math.round(arquivo.size / 1024)),
      }))
    );
  }

  return mapPagamentoParcialMulta(pagamento);
}

export async function listarPagamentosParciaisMultaPorMulta(multaId: string): Promise<PagamentoParcialMulta[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pagamentos_parciais_multa")
    .select("*")
    .eq("multa_id", multaId)
    .order("enviado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPagamentoParcialMulta);
}

/** Fila de conferência do financeiro multas — todos os envios ainda aguardando confirmação, de
 * qualquer multa. */
export async function listarPagamentosParciaisMultaPendentes(): Promise<PagamentoParcialMulta[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pagamentos_parciais_multa")
    .select("*")
    .eq("status", "aguardando_confirmacao")
    .order("enviado_em", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPagamentoParcialMulta);
}

export async function listarComprovantesPorPagamentoParcialMulta(
  pagamentoParcialMultaId: string
): Promise<Documento[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("pagamento_parcial_multa_id", pagamentoParcialMultaId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocumento);
}

async function buscarPagamentoPendente(supabase: SupabaseAdmin, pagamentoParcialMultaId: string) {
  const { data: pagamento } = await supabase
    .from("pagamentos_parciais_multa")
    .select("*")
    .eq("id", pagamentoParcialMultaId)
    .maybeSingle();
  if (!pagamento) throw new Error("Pagamento não encontrado");
  if (pagamento.status !== "aguardando_confirmacao") {
    throw new Error("Este pagamento não está mais aguardando confirmação.");
  }
  return pagamento;
}

/** Administrador confere o recebimento na conta bancária e confirma esse envio específico — o
 * valor passa a contar pra `multas.valor_pago`; se cobrir o que falta (considerando qualquer
 * desconto administrativo aplicado), a multa vira "paga".
 *
 * A transição do pagamento (aguardando_confirmacao -> confirmado) e a soma em
 * `multas.valor_pago` são feitas de forma atômica — mesmo esquema já usado nas parcelas de
 * contrato/acordo, pra dois cliques em "confirmar" não conseguirem creditar o mesmo pagamento
 * duas vezes. */
export async function confirmarPagamentoParcialMulta(
  pagamentoParcialMultaId: string
): Promise<PagamentoParcialMulta> {
  const supabase = createAdminClient();
  const pagamento = await buscarPagamentoPendente(supabase, pagamentoParcialMultaId);
  const agora = new Date().toISOString();

  const { data: atualizado, error } = await supabase
    .from("pagamentos_parciais_multa")
    .update({ status: "confirmado", confirmado_em: agora })
    .eq("id", pagamentoParcialMultaId)
    .eq("status", "aguardando_confirmacao")
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!atualizado) throw new Error("Este pagamento não está mais aguardando confirmação.");

  const { data: multa } = await supabase
    .from("multas")
    .select("*")
    .eq("id", pagamento.multa_id as string)
    .maybeSingle();
  if (!multa) throw new Error("Multa não encontrada");

  const { data: novoValorPago, error: erroIncremento } = await supabase.rpc("incrementar_valor_pago_multa", {
    p_multa_id: multa.id as string,
    p_incremento: pagamento.valor as number,
  });
  if (erroIncremento || novoValorPago === null) {
    throw new Error(erroIncremento?.message ?? "Não foi possível atualizar o valor pago da multa.");
  }

  const multaAtualizada = { ...mapMulta(multa), valorPago: novoValorPago as number };
  const saldo = calcularValorAtualizadoMulta(multaAtualizada);
  const quitada = saldo <= 0.01;
  if (quitada) {
    await supabase
      .from("multas")
      .update({ situacao: "paga", forma_pagamento: pagamento.forma_pagamento })
      .eq("id", multa.id as string);
  }

  await supabase.rpc("inserir_movimento_extrato", {
    p_contrato_id: multa.contrato_id as string,
    p_descricao: quitada
      ? `Pagamento da multa ${multa.numero_auto} (quitada)`
      : `Pagamento parcial da multa ${multa.numero_auto}`,
    p_data: agora,
    p_tipo: "entrada",
    p_valor: pagamento.valor as number,
  });

  const usuarioId = await usuarioIdDoContrato(supabase, multa.contrato_id as string);
  if (usuarioId) {
    await criarNotificacao({
      id: crypto.randomUUID(),
      usuarioId,
      tipo: "pagamento_confirmado",
      titulo: "Pagamento confirmado",
      mensagem: quitada
        ? `O pagamento da multa ${multa.numero_auto} foi confirmado e ela está paga.`
        : `Recebemos seu pagamento parcial da multa ${multa.numero_auto}. Saldo restante atualizado.`,
      lida: false,
      criadoEm: agora,
      link: "/multas",
    });
  }

  return mapPagamentoParcialMulta(atualizado);
}

/** Administrador não encontrou esse valor na conta — recusa só esse envio específico, sem afetar
 * outros pagamentos parciais que continuem aguardando confirmação na mesma multa. */
export async function recusarPagamentoParcialMulta(
  pagamentoParcialMultaId: string
): Promise<PagamentoParcialMulta> {
  const supabase = createAdminClient();
  const pagamento = await buscarPagamentoPendente(supabase, pagamentoParcialMultaId);

  const { data: atualizado, error } = await supabase
    .from("pagamentos_parciais_multa")
    .update({ status: "recusado" })
    .eq("id", pagamentoParcialMultaId)
    .select()
    .single();
  if (error || !atualizado) throw new Error(error?.message ?? "Não foi possível recusar o pagamento.");

  const { data: multa } = await supabase
    .from("multas")
    .select("numero_auto, contrato_id")
    .eq("id", pagamento.multa_id as string)
    .maybeSingle();
  if (multa) {
    const usuarioId = await usuarioIdDoContrato(supabase, multa.contrato_id as string);
    if (usuarioId) {
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId,
        tipo: "pagamento_recusado",
        titulo: "Pagamento não confirmado",
        mensagem: `Não conseguimos confirmar um dos pagamentos enviados da multa ${multa.numero_auto}. Verifique e tente novamente.`,
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/multas",
      });
    }
  }

  return mapPagamentoParcialMulta(atualizado);
}
