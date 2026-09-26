import type { NextRequest } from "next/server";
import { marcarTodasComoLidas } from "@/lib/server/notificacoes.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(_request: NextRequest) {
  // Sempre a própria sessão — nunca um `usuarioId` vindo do corpo, senão qualquer usuário
  // autenticado poderia marcar como lidas as notificações de OUTRO usuário.
  return handleRoute(async ({ userId }) => {
    await marcarTodasComoLidas(userId);
    return null;
  });
}
