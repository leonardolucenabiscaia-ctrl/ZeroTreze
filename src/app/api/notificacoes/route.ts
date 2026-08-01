import type { NextRequest } from "next/server";
import { listarNotificacoesPorUsuario } from "@/lib/server/notificacoes.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const usuarioId = request.nextUrl.searchParams.get("usuarioId");
  if (!usuarioId) return handleRoute(async () => []);
  return handleRoute(() => listarNotificacoesPorUsuario(usuarioId));
}
