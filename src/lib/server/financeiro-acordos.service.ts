import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapDocumento, mapParcelaAcordo } from "./mappers";
import { criarNotificacao } from "./notificacoes.service";
import type { Documento, ParcelaAcordo } from "@/lib/types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

async function usuarioIdDoCliente(supabase: SupabaseAdmin, clienteId: string): Promise<string | undefined> {
  const { data } = await supabase.from("clientes").select("usuario_id").eq("id", clienteId).maybeSingle();
  return data?.usuario_id;
}

/** O cliente envia o comprovante de pagamento (anexos opcionais), mas a parcela do acordo NÃO é
 * marcada como paga imediatamente — fica "aguardando_confirmacao" até o administrador conferir o
 * recebimento na conta bancária e confirmar manualmente (mesmo fluxo das parcelas de contrato). */
export async function enviarComprovantePagamentoAcordo(
  parcelaAcordoId: string,
  formaPagamento: "pix" | "boleto",
  anexos: File[]
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
    throw new Error("Esta parcela já está aguardando confirmação do pagamento.");
  }

  const agora = new Date().toISOString();
  const { data: atualizada, error } = await supabase
    .from("parcelas_acordo")
    .update({ status: "aguardando_confirmacao", forma_pagamento: formaPagamento, data_envio_comprovante: agora })
    .eq("id", parcelaAcordoId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível enviar o comprovante.");

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
        categoria: "comprovante",
        nome: arquivo.name,
        url: "#",
        tamanho_kb: Math.max(1, Math.round(arquivo.size / 1024)),
        criado_em: agora,
      }))
    );
  }

  return mapParcelaAcordo(atualizada);
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

/** Administrador confirma que o pagamento caiu na conta — só então a parcela do acordo vira
 * "pago". Se todas as parcelas do acordo estiverem pagas, o acordo inteiro passa a "quitado". */
export async function confirmarPagamentoAcordo(parcelaAcordoId: string): Promise<ParcelaAcordo> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase
    .from("parcelas_acordo")
    .select("*")
    .eq("id", parcelaAcordoId)
    .maybeSingle();
  if (!parcela) throw new Error("Parcela do acordo não encontrada");
  if (parcela.status !== "aguardando_confirmacao") {
    throw new Error("Esta parcela não está aguardando confirmação.");
  }

  const dataPagamento = new Date().toISOString();
  const { data: atualizada, error } = await supabase
    .from("parcelas_acordo")
    .update({ status: "pago", data_pagamento: dataPagamento })
    .eq("id", parcelaAcordoId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível confirmar o pagamento.");

  const { data: acordo } = await supabase
    .from("acordos")
    .select("id, numero, cliente_id")
    .eq("id", parcela.acordo_id as string)
    .maybeSingle();

  if (acordo) {
    const { data: demaisParcelas } = await supabase
      .from("parcelas_acordo")
      .select("status")
      .eq("acordo_id", acordo.id);
    if ((demaisParcelas ?? []).every((p) => p.status === "pago")) {
      await supabase.from("acordos").update({ situacao: "quitado" }).eq("id", acordo.id);
    }

    const usuarioId = await usuarioIdDoCliente(supabase, acordo.cliente_id as string);
    if (usuarioId) {
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId,
        tipo: "pagamento_confirmado",
        titulo: "Pagamento confirmado",
        mensagem: `O pagamento da parcela ${atualizada.numero} do acordo ${acordo.numero} foi confirmado.`,
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/financeiro-acordos",
      });
    }
  }

  return mapParcelaAcordo(atualizada);
}

/** Administrador não encontrou o pagamento na conta — devolve a parcela do acordo para cobrança. */
export async function recusarPagamentoAcordo(parcelaAcordoId: string): Promise<ParcelaAcordo> {
  const supabase = createAdminClient();
  const { data: parcela } = await supabase
    .from("parcelas_acordo")
    .select("*")
    .eq("id", parcelaAcordoId)
    .maybeSingle();
  if (!parcela) throw new Error("Parcela do acordo não encontrada");
  if (parcela.status !== "aguardando_confirmacao") {
    throw new Error("Esta parcela não está aguardando confirmação.");
  }

  const novoStatus = new Date(parcela.vencimento as string).getTime() < Date.now() ? "vencido" : "em_aberto";
  const { data: atualizada, error } = await supabase
    .from("parcelas_acordo")
    .update({ status: novoStatus, data_envio_comprovante: null, forma_pagamento: null })
    .eq("id", parcelaAcordoId)
    .select()
    .single();
  if (error || !atualizada) throw new Error(error?.message ?? "Não foi possível recusar o pagamento.");

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
        mensagem: `Não conseguimos confirmar o pagamento da parcela ${atualizada.numero} do acordo ${acordo.numero}. Verifique e tente novamente.`,
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/financeiro-acordos",
      });
    }
  }

  return mapParcelaAcordo(atualizada);
}
