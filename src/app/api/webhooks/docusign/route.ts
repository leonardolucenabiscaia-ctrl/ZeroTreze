import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao } from "@/lib/server/notificacoes.service";

/**
 * Recebe as notificações do DocuSign Connect, configuradas manualmente no painel deles
 * (Settings → Connect → Add Configuration → URL to Publish: esta rota, formato JSON, eventos de
 * envelope: Sent/Delivered/Completed/Declined/Voided).
 *
 * TODO(quando os primeiros webhooks reais chegarem): a forma exata do payload JSON do Connect
 * (aggregate vs. "Send Individual Messages", eventData incluído ou não) não pôde ser confirmada
 * contra a documentação ao vivo da DocuSign no momento em que este código foi escrito — o parsing
 * abaixo tenta os caminhos mais comumente documentados (`data.envelopeId`/`data.envelopeSummary.status`
 * e variações "achatadas"), e loga o payload bruto pra calibrar assim que um webhook real chegar.
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
