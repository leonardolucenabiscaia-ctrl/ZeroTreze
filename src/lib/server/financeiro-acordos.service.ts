import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapDocumento, mapParcelaAcordo } from "./mappers";
import { criarNotificacao } from "./notificacoes.service";
import type { Documento, ParcelaAcordo } from "@/lib/types";

export type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/** Se todas as parcelas do acordo estiverem pagas, o acordo inteiro passa a "quitado". */
export async function atualizarSituacaoDoAcordoSeQuitado(supabase: SupabaseAdmin, acordoId: string): Promise<void> {
  const { data: demaisParcelas } = await supabase.from("parcelas_acordo").select("status").eq("acordo_id", acordoId);
  if ((demaisParcelas ?? []).every((p) => p.status === "pago")) {
    await supabase.from("acordos").update({ situacao: "quitado" }).eq("id", acordoId);
  }
}

export async function usuarioIdDoCliente(supabase: SupabaseAdmin, clienteId: string): Promise<string | undefined> {
  const { data } = await supabase.from("clientes").select("usuario_id").eq("id", clienteId).maybeSingle();
  return data?.usuario_id;
}

export async function listarComprovantesPorParcelaAcordo(parcelaAcordoId: string): Promise<Documento[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("parcela_acordo_id", parcelaAcordoId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocumento);
}

export interface DescontoParcelaAcordoInput {
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

/** Aplica (ou remove, se ambas as formas vierem vazias) um desconto administrativo sobre uma
 * parcela de acordo ainda não paga. */
export async function aplicarDescontoParcelaAcordo(
  parcelaAcordoId: string,
  desconto: DescontoParcelaAcordoInput,
  usuarioNome: string
): Promise<ParcelaAcordo> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase
    .from("parcelas_acordo")
    .select("*")
    .eq("id", parcelaAcordoId)
    .maybeSingle();
  if (!parcela) throw new Error("Parcela do acordo não encontrada");
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
    .from("parcelas_acordo")
    .update(patch)
    .eq("id", parcelaAcordoId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível aplicar o desconto.");

  if (!semDesconto) {
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
          tipo: "desconto_parcela_aplicado",
          titulo: "Desconto aplicado",
          mensagem: `Você recebeu um desconto na parcela ${atualizada.numero} do acordo ${acordo.numero}.`,
          lida: false,
          criadoEm: new Date().toISOString(),
          link: "/financeiro-acordos",
        });
      }
    }
  }

  return mapParcelaAcordo(atualizada);
}

export interface BaixaManualAcordoInput {
  valor: number;
  formaPagamento: "pix" | "boleto" | "dinheiro" | "outro";
  motivo: string;
}

/** Administrador registra que recebeu um pagamento fora do fluxo digital (dinheiro, ou outro
 * meio sem comprovante) e dá baixa direto na parcela do acordo — sem passar por
 * "aguardando_confirmacao". Se essa for a última parcela em aberto, o acordo vira "quitado". */
export async function darBaixaManualAcordo(
  parcelaAcordoId: string,
  dados: BaixaManualAcordoInput,
  usuarioNome: string
): Promise<ParcelaAcordo> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase
    .from("parcelas_acordo")
    .select("*")
    .eq("id", parcelaAcordoId)
    .maybeSingle();
  if (!parcela) throw new Error("Parcela do acordo não encontrada");
  if (parcela.status === "pago") throw new Error("Esta parcela já está paga.");
  if (parcela.status === "aguardando_confirmacao") {
    throw new Error("Esta parcela já tem um comprovante aguardando confirmação — revise por lá.");
  }
  if (!(dados.valor > 0)) throw new Error("O valor recebido deve ser maior que zero.");
  if (!dados.motivo.trim()) throw new Error("Explique como esse pagamento foi recebido.");

  const agora = new Date().toISOString();
  // O filtro extra `.eq("status", parcela.status)` faz a baixa só valer se o status ainda for
  // exatamente o que acabamos de ler — trava a linha no Postgres, então um duplo clique ou duas
  // pessoas dando baixa na mesma parcela ao mesmo tempo não geram dois lançamentos duplicados no
  // extrato: a segunda chamada encontra o status já mudado e cai no erro abaixo.
  const { data: atualizada, error } = await supabase
    .from("parcelas_acordo")
    .update({
      status: "pago",
      data_pagamento: agora,
      forma_pagamento: dados.formaPagamento,
      baixa_manual_valor: dados.valor,
      baixa_manual_por_nome: usuarioNome,
      baixa_manual_em: agora,
      baixa_manual_motivo: dados.motivo.trim(),
    })
    .eq("id", parcelaAcordoId)
    .eq("status", parcela.status)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!atualizada) throw new Error("Esta parcela já foi paga por outra ação — recarregue a página.");

  const { data: acordo } = await supabase
    .from("acordos")
    .select("id, numero, cliente_id")
    .eq("id", parcela.acordo_id as string)
    .maybeSingle();

  if (acordo) {
    await atualizarSituacaoDoAcordoSeQuitado(supabase, acordo.id as string);

    const usuarioId = await usuarioIdDoCliente(supabase, acordo.cliente_id as string);
    if (usuarioId) {
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId,
        tipo: "pagamento_confirmado",
        titulo: "Pagamento confirmado",
        mensagem: `O pagamento da parcela ${atualizada.numero} do acordo ${acordo.numero} foi confirmado.`,
        lida: false,
        criadoEm: agora,
        link: "/financeiro-acordos",
      });
    }
  }

  return mapParcelaAcordo(atualizada);
}
