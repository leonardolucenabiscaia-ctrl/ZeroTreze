import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao } from "@/lib/server/notificacoes.service";

/**
 * Recebe as notificações da ClickSign (configurado no painel deles: Configurações → Webhooks →
 * URL desta rota). Assinatura verificada via HMAC-SHA256 no header `x-clicksign-signature`
 * (CLICKSIGN_WEBHOOK_SECRET, gerado quando o webhook é cadastrado) — se o segredo ainda não
 * estiver configurado, não bloqueia (melhor esforço, igual o resto das integrações deste app).
 *
 * Formato do payload ainda não confirmado contra um evento real (só documentado): `event.name`
 * (ex.: "document_closed") + um array `document`. O parsing abaixo tenta achar o identificador do
 * envelope em alguns lugares plausíveis — ajustar depois de ver um payload real, como aconteceu
 * com a DocuSign.
 */
function assinaturaValida(corpoBruto: string, assinaturaRecebida: string | null): boolean {
  const segredo = process.env.CLICKSIGN_WEBHOOK_SECRET;
  if (!segredo) return true;
  if (!assinaturaRecebida) return false;
  const hmac = crypto.createHmac("sha256", segredo).update(corpoBruto).digest("hex");
  return hmac === assinaturaRecebida;
}

export async function POST(request: NextRequest) {
  const corpoBruto = await request.text();
  const assinatura = request.headers.get("x-clicksign-signature");

  if (!assinaturaValida(corpoBruto, assinatura)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ error: "Corpo da requisição não é um JSON válido." }, { status: 400 });
  }

  console.log("[clicksign:webhook] payload recebido:", corpoBruto);

  // DEBUG TEMPORÁRIO — grava o payload bruto na auditoria pra inspecionar sem acesso aos logs do
  // Vercel. Remover depois de confirmar o formato real do evento contra um teste de ponta a
  // ponta.
  try {
    const supabaseDebug = createAdminClient();
    const { data: usuarioQualquer } = await supabaseDebug.from("usuarios").select("id").limit(1).single();
    if (usuarioQualquer) {
      await supabaseDebug.from("auditoria").insert({
        usuario_id: usuarioQualquer.id,
        usuario_nome: "Webhook ClickSign (debug)",
        acao: "Payload recebido",
        entidade: "Debug ClickSign",
        entidade_id: corpoBruto.slice(0, 900),
      });
    }
  } catch (erroDebug) {
    console.error("[clicksign:webhook] falha ao gravar debug:", erroDebug);
  }

  const event = payload.event as Record<string, unknown> | undefined;
  const eventName = event?.name as string | undefined;
  const documentField = payload.document;
  const documento = Array.isArray(documentField) ? documentField[0] : documentField;
  const documentoObj = documento as Record<string, unknown> | undefined;
  const envelopeId =
    (documentoObj?.envelope_id as string | undefined) ??
    ((documentoObj?.envelope as Record<string, unknown> | undefined)?.id as string | undefined) ??
    (payload.envelope_id as string | undefined) ??
    ((payload.envelope as Record<string, unknown> | undefined)?.id as string | undefined);

  if (!envelopeId || !eventName) {
    return NextResponse.json({ recebido: true, ignorado: "sem envelopeId/evento reconhecível" });
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
    .update({ assinatura_status: eventName, assinatura_atualizado_em: new Date().toISOString() })
    .eq("id", contrato.id);

  if (eventName !== contrato.assinatura_status) {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("usuario_id")
      .eq("id", contrato.cliente_id)
      .maybeSingle();

    if (cliente) {
      const statusEhFinal = /closed|signed|assin/i.test(eventName);
      await criarNotificacao({
        id: crypto.randomUUID(),
        usuarioId: cliente.usuario_id,
        tipo: "documento_disponivel",
        titulo: statusEhFinal ? "Contrato assinado com sucesso" : "Atualização na assinatura do contrato",
        mensagem: statusEhFinal
          ? `O contrato ${contrato.numero} foi assinado eletronicamente.`
          : `O status da assinatura do contrato ${contrato.numero} mudou para "${eventName}".`,
        lida: false,
        criadoEm: new Date().toISOString(),
        link: "/contratos",
      });
    }
  }

  return NextResponse.json({ recebido: true });
}
