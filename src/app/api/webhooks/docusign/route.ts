import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao } from "@/lib/server/notificacoes.service";

/**
 * Recebe as notificações do DocuSign Connect (configurado no painel deles: Settings → Connect →
 * Configuration ID 22263629 → formato REST v2.1/JSON → eventos Sent/Delivered/Completed/Declined/
 * Voided → URL desta rota).
 *
 * Confirmado contra webhooks reais (2026-08-04): o payload não inclui `envelopeSummary.status`
 * nem `data.status` "limpo" — o status usável é o próprio nome do evento em `event`
 * (ex.: "envelope-sent", "envelope-delivered", "envelope-completed"). O parsing abaixo tenta os
 * campos mais estruturados primeiro só por robustez, mas na prática sempre cai no fallback
 * `payload.event`.
 */
export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição não é um JSON válido." }, { status: 400 });
  }

  console.log("[docusign:webhook] payload recebido:", JSON.stringify(payload));

  const data = (payload.data as Record<string, unknown> | undefined) ?? payload;
  const envelopeId = (data.envelopeId as string | undefined) ?? (payload.envelopeId as string | undefined);
  const envelopeSummary = data.envelopeSummary as Record<string, unknown> | undefined;
  const status =
    (envelopeSummary?.status as string | undefined) ??
    (data.status as string | undefined) ??
    (payload.status as string | undefined) ??
    (payload.event as string | undefined);

  if (!envelopeId || !status) {
    return NextResponse.json({ recebido: true, ignorado: "sem envelopeId/status reconhecível" });
  }

  const supabase = createAdminClient();
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, numero, cliente_id, assinatura_status")
    .eq("assinatura_document_key", envelopeId)
    .maybeSingle();

  if (!contrato) {
    return NextResponse.json({ recebido: true, ignorado: "envelopeId não corresponde a nenhum contrato" });
  }

  await supabase
    .from("contratos")
    .update({ assinatura_status: status, assinatura_atualizado_em: new Date().toISOString() })
    .eq("id", contrato.id);

  if (status !== contrato.assinatura_status) {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("usuario_id")
      .eq("id", contrato.cliente_id)
      .maybeSingle();

    if (cliente) {
      const statusEhFinal = /completed|signed|assin/i.test(status);
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId: cliente.usuario_id,
        tipo: "documento_disponivel",
        titulo: statusEhFinal ? "Contrato assinado com sucesso" : "Atualização na assinatura do contrato",
        mensagem: statusEhFinal
          ? `O contrato ${contrato.numero} foi assinado eletronicamente.`
          : `O status da assinatura do contrato ${contrato.numero} mudou para "${status}".`,
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/contratos",
      });
    }
  }

  return NextResponse.json({ recebido: true });
}
