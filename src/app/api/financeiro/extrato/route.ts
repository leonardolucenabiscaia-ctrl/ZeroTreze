import type { NextRequest } from "next/server";
import { listarExtratoPorContrato } from "@/lib/server/financeiro.service";
import { handleRoute, podeAcessarContrato } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const contratoId = request.nextUrl.searchParams.get("contratoId");
  return handleRoute(async (sessao) => {
    if (!contratoId) return [];
    if (!(await podeAcessarContrato(sessao, contratoId))) throw new Error("Sem permissão para acessar este recurso.");
    return listarExtratoPorContrato(contratoId);
  });
}
