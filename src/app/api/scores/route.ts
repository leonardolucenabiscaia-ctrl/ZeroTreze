import type { NextRequest } from "next/server";
import { buscarScorePorCliente, listarScores } from "@/lib/server/score.service";
import { handleRoute, podeAcessarCliente, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const clienteId = request.nextUrl.searchParams.get("clienteId");
  return handleRoute(
    async (sessao) => {
      if (!clienteId) return listarScores();
      if (!(await podeAcessarCliente(sessao, clienteId))) throw new Error("Sem permissão para acessar este recurso.");
      return buscarScorePorCliente(clienteId);
    },
    200,
    clienteId ? undefined : PERFIS_STAFF
  );
}
