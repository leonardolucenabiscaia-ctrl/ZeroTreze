import type { NextRequest } from "next/server";
import {
  listarPagamentosParciaisAcordoPendentes,
  listarPagamentosParciaisAcordoPorParcela,
} from "@/lib/server/pagamentos-parciais-acordo.service";
import { handleRoute, podeAcessarParcelaAcordo, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parcelaAcordoId = params.get("parcelaAcordoId");
  const pendentes = params.get("pendentes") === "true";

  return handleRoute(
    async (sessao) => {
      if (pendentes) return listarPagamentosParciaisAcordoPendentes();
      if (parcelaAcordoId) {
        if (!(await podeAcessarParcelaAcordo(sessao, parcelaAcordoId))) {
          throw new Error("Sem permissão para acessar este recurso.");
        }
        return listarPagamentosParciaisAcordoPorParcela(parcelaAcordoId);
      }
      return Promise.resolve([]);
    },
    200,
    pendentes ? PERFIS_STAFF : undefined
  );
}
