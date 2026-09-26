import type { NextRequest } from "next/server";
import { listarComprovantesPorParcelaAcordo } from "@/lib/server/financeiro-acordos.service";
import { handleRoute, podeAcessarParcelaAcordo } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const parcelaAcordoId = request.nextUrl.searchParams.get("parcelaAcordoId");
  return handleRoute(async (sessao) => {
    if (!parcelaAcordoId) return [];
    if (!(await podeAcessarParcelaAcordo(sessao, parcelaAcordoId))) {
      throw new Error("Sem permissão para acessar este recurso.");
    }
    return listarComprovantesPorParcelaAcordo(parcelaAcordoId);
  });
}
