import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { calcularSaldoAcordo } from "@/lib/calculations/parcela-acordo";
import { mapDocumento, mapPagamentoParcialAcordo, mapParcelaAcordo } from "./mappers";
import { criarNotificacao } from "./notificacoes.service";
import { atualizarSituacaoDoAcordoSeQuitado, usuarioIdDoCliente, type SupabaseAdmin } from "./financeiro-acordos.service";
import type { Documento, PagamentoParcialAcordo } from "@/lib/types";

export interface PagamentoParcialAcordoInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
}

/** O locatário envia um pagamento parcial pra uma parcela de acordo — mesmo esquema das parcelas
 * de contrato: fica "aguardando_confirmacao" até o administrador conferir o recebimento na conta
 * bancária, e pode mandar quantos envios quiser (o cliente vai completando aos poucos ao longo da
 * semana); só quando confirmado o valor entra em `parcelas_acordo.valor_pago`. */
export async function enviarPagamentoParcialAcordo(
  parcelaAcordoId: string,
  dados: PagamentoParcialAcordoInput,
  anexos: File[]
): Promise<PagamentoParcialAcordo> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase
    .from("parcelas_acordo")
    .select("*")
    .eq("id", parcelaAcordoId)
    .maybeSingle();
  if (!parcela) throw new Error("Parcela do acordo não encontrada");
  if (parcela.status === "pago") throw new Error("Esta parcela já está paga.");
  if (!(dados.valor > 0)) throw new Error("O valor deve ser maior que zero.");
  if (anexos.length === 0) throw new Error("Anexe o comprovante de pagamento.");

  const saldo = calcularSaldoAcordo(mapParcelaAcordo(parcela));

  const { data: pendentes } = await supabase
    .from("pagamentos_parciais_acordo")
    .select("valor")
    .eq("parcela_acordo_id", parcelaAcordoId)
    .eq("status", "aguardando_confirmacao");
  const totalPendente = (pendentes ?? []).reduce((soma, p) => soma + (p.valor as number), 0);
  const saldoDisponivel = saldo - totalPendente;

  if (dados.valor > saldoDisponivel + 0.01) {
    throw new Error(
      `Esse valor é maior que o saldo em aberto (${saldoDisponivel.toFixed(2)}) — considerando outros envios já aguardando confirmação.`
    );
  }

  const { data: pagamento, error } = await supabase
    .from("pagamentos_parciais_acordo")
    .insert({ parcela_acordo_id: parcelaAcordoId, valor: dados.valor, forma_pagamento: dados.formaPagamento })
    .select()
    .single();
  if (error || !pagamento) throw new Error(error?.message ?? "Não foi possível enviar o pagamento.");

  if (anexos.length > 0) {
    const { data: acordo } = await supabase
      .from("acordos")
      .select("cliente_id, contrato_id")
      .eq("id", parcela.acordo_id as string)
      .maybeSingle();
    await supabase.from("documentos").insert(
      anexos.map((arquivo) => ({
        cliente_id: acordo?.cliente_id ?? null,
        contrato_id: acordo?.contrato_id ?? null,
        acordo_id: parcela.acordo_id,
        parcela_acordo_id: parcelaAcordoId,
        pagamento_parcial_acordo_id: pagamento.id,
        categoria: "comprovante",
        nome: arquivo.name,
        url: "#",
        tamanho_kb: Math.max(1, Math.round(arquivo.size / 1024)),
      }))
    );
  }

  return mapPagamentoParcialAcordo(pagamento);
}

export async function listarPagamentosParciaisAcordoPorParcela(
  parcelaAcordoId: string
): Promise<PagamentoParcialAcordo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pagamentos_parciais_acordo")
    .select("*")
    .eq("parcela_acordo_id", parcelaAcordoId)
    .order("enviado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPagamentoParcialAcordo);
}

/** Fila de conferência do financeiro acordos — todos os envios ainda aguardando confirmação, de
 * qualquer parcela de qualquer acordo. */
export async function listarPagamentosParciaisAcordoPendentes(): Promise<PagamentoParcialAcordo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pagamentos_parciais_acordo")
    .select("*")
    .eq("status", "aguardando_confirmacao")
    .order("enviado_em", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPagamentoParcialAcordo);
}

export async function listarComprovantesPorPagamentoParcialAcordo(
  pagamentoParcialAcordoId: string
): Promise<Documento[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("pagamento_parcial_acordo_id", pagamentoParcialAcordoId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocumento);
}

async function buscarPagamentoPendente(supabase: SupabaseAdmin, pagamentoParcialAcordoId: string) {
  const { data: pagamento } = await supabase
    .from("pagamentos_parciais_acordo")
    .select("*")
    .eq("id", pagamentoParcialAcordoId)
    .maybeSingle();
  if (!pagamento) throw new Error("Pagamento não encontrado");
  if (pagamento.status !== "aguardando_confirmacao") {
    throw new Error("Este pagamento não está mais aguardando confirmação.");
  }
  return pagamento;
}

/** Administrador confere o recebimento na conta bancária e confirma esse envio específico — o
 * valor passa a contar pra `parcelas_acordo.valor_pago`; se cobrir o que falta (considerando
 * qualquer desconto administrativo aplicado), ela vira "pago". Se essa for a última parcela em
 * aberto do acordo, o acordo inteiro vira "quitado".
 *
 * A transição do pagamento (aguardando_confirmacao -> confirmado) e a soma em
 * `parcelas_acordo.valor_pago` são feitas de forma atômica — de propósito, pra dois cliques em
 * "confirmar" (duplo clique, ou dois administradores no mesmo item da fila) não conseguirem
 * creditar o mesmo pagamento duas vezes nem perder o incremento um do outro. Quem decide "ficou
 * quitada?" é sempre `calcularSaldoAcordo` (a mesma conta usada em todo o resto do sistema, já
 * considerando o desconto) — nunca uma comparação direta contra o valor da parcela, que ficaria
 * errada quando há desconto aplicado. */
export async function confirmarPagamentoParcialAcordo(
  pagamentoParcialAcordoId: string
): Promise<PagamentoParcialAcordo> {
  const supabase = createAdminClient();
  const pagamento = await buscarPagamentoPendente(supabase, pagamentoParcialAcordoId);
  const agora = new Date().toISOString();

  // Só transiciona se ainda estiver "aguardando_confirmacao" nesse exato instante — o filtro
  // extra no .eq() faz o Postgres travar a linha e garantir que só uma chamada concorrente
  // consiga fazer essa transição pra esse pagamento específico.
  const { data: atualizado, error } = await supabase
    .from("pagamentos_parciais_acordo")
    .update({ status: "confirmado", confirmado_em: agora })
    .eq("id", pagamentoParcialAcordoId)
    .eq("status", "aguardando_confirmacao")
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!atualizado) throw new Error("Este pagamento não está mais aguardando confirmação.");

  const { data: parcela } = await supabase
    .from("parcelas_acordo")
    .select("*")
    .eq("id", pagamento.parcela_acordo_id as string)
    .maybeSingle();
  if (!parcela) throw new Error("Parcela do acordo não encontrada");

  const { data: novoValorPago, error: erroIncremento } = await supabase.rpc(
    "incrementar_valor_pago_parcela_acordo",
    {
      p_parcela_acordo_id: parcela.id as string,
      p_incremento: pagamento.valor as number,
    }
  );
  if (erroIncremento || novoValorPago === null) {
    throw new Error(erroIncremento?.message ?? "Não foi possível atualizar o valor pago da parcela.");
  }

  const parcelaAtualizada = { ...mapParcelaAcordo(parcela), valorPago: novoValorPago as number };
  const saldo = calcularSaldoAcordo(parcelaAtualizada);
  const quitada = saldo <= 0.01;
  if (quitada) {
    await supabase
      .from("parcelas_acordo")
      .update({ status: "pago", data_pagamento: agora })
      .eq("id", parcela.id as string);
  }

  const { data: acordo } = await supabase
    .from("acordos")
    .select("id, numero, cliente_id, contrato_id")
    .eq("id", parcela.acordo_id as string)
    .maybeSingle();

  if (acordo) {
    if (quitada) await atualizarSituacaoDoAcordoSeQuitado(supabase, acordo.id as string);

    // Lê o saldo anterior e insere a linha nova numa operação só, atômica (função no banco — ver
    // migração 0021) — evita que dois pagamentos do mesmo contrato confirmados quase ao mesmo
    // tempo leiam o mesmo saldo anterior e um dos dois lançamentos suma do saldo acumulado.
    await supabase.rpc("inserir_movimento_extrato", {
      p_contrato_id: acordo.contrato_id as string,
      p_descricao: quitada
        ? `Pagamento parcela ${parcela.numero} do acordo ${acordo.numero} (quitada)`
        : `Pagamento parcial da parcela ${parcela.numero} do acordo ${acordo.numero}`,
      p_data: agora,
      p_tipo: "entrada",
      p_valor: pagamento.valor as number,
    });

    const usuarioId = await usuarioIdDoCliente(supabase, acordo.cliente_id as string);
    if (usuarioId) {
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId,
        tipo: "pagamento_confirmado",
        titulo: "Pagamento confirmado",
        mensagem: quitada
          ? `O pagamento da parcela ${parcela.numero} do acordo ${acordo.numero} foi confirmado e ela está quitada.`
          : `Recebemos seu pagamento parcial da parcela ${parcela.numero} do acordo ${acordo.numero}. Saldo restante atualizado.`,
        lida: false,
        criadoEm: agora,
        link: "/financeiro-acordos",
      });
    }
  }

  return mapPagamentoParcialAcordo(atualizado);
}

/** Administrador não encontrou esse valor na conta — recusa só esse envio específico, sem afetar
 * outros pagamentos parciais que continuem aguardando confirmação na mesma parcela. */
export async function recusarPagamentoParcialAcordo(
  pagamentoParcialAcordoId: string
): Promise<PagamentoParcialAcordo> {
  const supabase = createAdminClient();
  const pagamento = await buscarPagamentoPendente(supabase, pagamentoParcialAcordoId);

  const { data: atualizado, error } = await supabase
    .from("pagamentos_parciais_acordo")
    .update({ status: "recusado" })
    .eq("id", pagamentoParcialAcordoId)
    .select()
    .single();
  if (error || !atualizado) throw new Error(error?.message ?? "Não foi possível recusar o pagamento.");

  const { data: parcela } = await supabase
    .from("parcelas_acordo")
    .select("numero, acordo_id")
    .eq("id", pagamento.parcela_acordo_id as string)
    .maybeSingle();
  if (parcela) {
    const { data: acordo } = await supabase
      .from("acordos")
      .select("numero, cliente_id")
      .eq("id", parcela.acordo_id as string)
      .maybeSingle();
    if (acordo) {
      const usuarioId = await usuarioIdDoCliente(supabase, acordo.cliente_id as string);
      if (usuarioId) {
        await criarNotificacao({
          id: crypto.randomUUID(),
          usuarioId,
          tipo: "pagamento_recusado",
          titulo: "Pagamento não confirmado",
          mensagem: `Não conseguimos confirmar um dos pagamentos enviados da parcela ${parcela.numero} do acordo ${acordo.numero}. Verifique e tente novamente.`,
          lida: false,
          criadoEm: new Date().toISOString(),
          link: "/financeiro-acordos",
        });
      }
    }
  }

  return mapPagamentoParcialAcordo(atualizado);
}
