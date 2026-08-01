import { NextRequest, NextResponse } from "next/server";

/**
 * Recebe os webhooks do AssinaDoc (configurados no painel deles para apontar para
 * `https://SEU-DOMINIO/api/webhooks/assinadoc`, assim que o site estiver publicado).
 *
 * Eventos que o AssinaDoc pode disparar aqui (conforme o painel):
 * - Alteração de solicitação de assinatura (assinada, aberta, recusada, cancelada, etc.)
 * - Documento finalizado (nenhuma solicitação pendente restante)
 * - E-mail de solicitação aberto (via pixel — pode ter falso positivo)
 * - Upload de documento
 * - Documento duplicado
 *
 * TODO(integração real): ainda não temos o formato exato do payload de cada evento nem o
 * método de verificação de autenticidade (assinatura/segredo compartilhado) usado pelo
 * AssinaDoc. Assim que o site estiver publicado e recebermos o primeiro webhook de teste,
 * usar o `console.log` abaixo para inspecionar o formato real e então:
 *   1. Validar a autenticidade da requisição (ver docs do AssinaDoc sobre assinatura de webhook).
 *   2. Identificar o tipo de evento e o documento/contrato correspondente.
 *   3. Persistir o novo status (hoje ainda não há banco de dados real — ver conversa sobre isso).
 */
export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição não é um JSON válido." }, { status: 400 });
  }

  // Log temporário para descobrirmos o formato real do payload assim que os primeiros
  // webhooks de teste chegarem (remover depois que a integração estiver completa).
  console.log("[assinadoc:webhook] payload recebido:", JSON.stringify(payload, null, 2));

  // Responde 200 rapidamente — a maioria dos provedores de webhook (e provavelmente o
  // AssinaDoc também) desativa ou para de tentar reenviar se não receber um 2xx a tempo.
  return NextResponse.json({ recebido: true });
}
