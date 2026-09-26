import type { NextRequest } from "next/server";
import { listarNotificacoesPorUsuario } from "@/lib/server/notificacoes.service";
import { handleRoute, podeAcessarUsuario } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const usuarioId = request.nextUrl.searchParams.get("usuarioId");
  if (!usuarioId) return handleRoute(async () => []);
  return handleRoute(async (sessao) => {
    if (!podeAcessarUsuario(sessao, usuarioId)) throw new Error("Sem permissão para acessar este recurso.");
    return listarNotificacoesPorUsuario(usuarioId);
  });
}
