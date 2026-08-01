import type { NextRequest } from "next/server";
import { marcarTodasComoLidas } from "@/lib/server/notificacoes.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const { usuarioId } = await request.json();
    await marcarTodasComoLidas(usuarioId);
    return null;
  });
}
