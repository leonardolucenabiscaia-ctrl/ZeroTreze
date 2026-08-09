import { NextRequest, NextResponse } from "next/server";

/**
 * Handshake de verificação exigido pela Meta ao configurar a URL de callback do webhook: ela
 * chama esta rota com hub.mode=subscribe e um hub.challenge aleatório, e espera receber esse
 * challenge de volta em texto puro — só se hub.verify_token bater com o segredo configurado aqui
 * e no painel deles (WHATSAPP_VERIFY_TOKEN).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Recebe os eventos de verdade (mensagens recebidas, atualizações de status de entrega). Só
 * loga por enquanto — a lógica de negócio (ex.: registrar resposta do cliente) entra quando o
 * `whatsappProvider` real for implementado.
 */
export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição não é um JSON válido." }, { status: 400 });
  }

  console.log("[whatsapp:webhook] payload recebido:", JSON.stringify(payload));

  return NextResponse.json({ recebido: true });
}
