import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { criarNotificacao } from "@/lib/server/notificacoes.service";

/**
 * Recebe os webhooks do AssinaDoc, configurados no painel deles (Configurações → Webhooks)
 * apontando para `https://zero-treze.vercel.app/api/webhooks/assinadoc`.
 *
 * Payload confirmado pela documentação (https://assinadoc.readme.io/reference/getwebhooksnotifications):
 *   { document_key, signing_key, status, webhook_type, data: { file_name, date } }
 * `webhook_type` observado: REQUESTS_EMAIL_OPENED | REQUESTS_UPDATED | REQUESTS_CHAIN_UPDATED | REQUESTS_OPENED.
 *
 * TODO(quando os primeiros webhooks reais chegarem): a documentação não lista todos os valores
 * possíveis de `status` (só vimos "Pending" e "Open" nos exemplos) nem um mecanismo de assinatura/
 * segredo compartilhado para validar a autenticidade da requisição. Por enquanto a validação é
 * "o document_key bate com um contrato nosso" — refinar assim que soubermos o valor exato usado
 * para "assinado" (provavelmente "Signed" ou "Concluded") e se há um header de assinatura a
 * conferir.
 */
export async function POST(request: NextRequest) {
  let payload: {
    document_key?: string;
    signing_key?: string;
    status?: string;
    webhook_type?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição não é um JSON válido." }, { status: 400 });
  }

  console.log("[assinadoc:webhook] payload recebido:", JSON.stringify(payload));

  const { document_key: documentKey, status } = payload;
  if (!documentKey || !status) {
    return NextResponse.json({ recebido: true, ignorado: "sem document_key/status" });
  }

  const supabase = createAdminClient();
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, numero, cliente_id, assinatura_status")
    .eq("assinatura_document_key", documentKey)
    .maybeSingle();

  if (!contrato) {
    // Não é necessariamente um erro — pode ser um webhook de outro documento (ex.: um acordo,
    // quando essa integração também passar a usar a AssinaDoc).
    return NextResponse.json({ recebido: true, ignorado: "document_key não corresponde a nenhum contrato" });
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
      const statusEhFinal = /sign|conclu|assin/i.test(status);
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
