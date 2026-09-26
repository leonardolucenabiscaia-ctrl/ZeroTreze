import type { NextRequest } from "next/server";
import {
  listarPagamentosParciaisPendentes,
  listarPagamentosParciaisPorParcela,
} from "@/lib/server/pagamentos-parciais.service";
import { handleRoute, podeAcessarParcela, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parcelaId = params.get("parcelaId");
  const pendentes = params.get("pendentes") === "true";

  return handleRoute(
    async (sessao) => {
      if (pendentes) return listarPagamentosParciaisPendentes();
      if (parcelaId) {
        if (!(await podeAcessarParcela(sessao, parcelaId))) {
          throw new Error("Sem permissão para acessar este recurso.");
        }
        return listarPagamentosParciaisPorParcela(parcelaId);
      }
      return Promise.resolve([]);
    },
    200,
    pendentes ? PERFIS_STAFF : undefined
  );
}
