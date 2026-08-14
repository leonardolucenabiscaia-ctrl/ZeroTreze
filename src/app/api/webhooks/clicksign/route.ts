import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao } from "@/lib/server/notificacoes.service";

/**
 * Recebe as notificações da ClickSign (configurado via API — ver `setup-clicksign-webhook.mjs`
 * no histórico do projeto — assinado pra `document_closed`, `close`, `sign`, `deadline`,
 * `cancel`, `refusal`). Assinatura verificada via HMAC-SHA256 no header `x-clicksign-signature`
 * (CLICKSIGN_WEBHOOK_SECRET) — se o segredo ainda não estiver configurado, não bloqueia
 * (melhor esforço, igual o resto das integrações deste app).
 *
 * Formato confirmado testando ao vivo (2026-08-14): `payload.document` é um **objeto único**, não
 * array — `document.key` é o identificador que precisa bater com `assinatura_document_key`
 * (guarda o `documentId`, não o `envelopeId` — ver comentário em `contratos.service.ts`).
 * `payload.event.name` dá o nome do evento (ex.: "sign" por signatário, "document_closed" quando
 * todo mundo já assinou — só esse último conta como "concluído").
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

  const event = payload.event as Record<string, unknown> | undefined;
  const eventName = event?.name as string | undefined;
  const documento = payload.document as Record<string, unknown> | undefined;
  const documentId = documento?.key as string | undefined;

  if (!documentId || !eventName) {
    return NextResponse.json({ recebido: true, ignorado: "sem documentId/evento reconhecível" });
  }

  const supabase = createAdminClient();
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, numero, cliente_id, assinatura_status")
    .eq("assinatura_document_key", documentId)
    .maybeSingle();

  if (!contrato) {
    return NextResponse.json({ recebido: true, ignorado: "documentId não corresponde a nenhum contrato" });
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
