import type { NextRequest } from "next/server";
import {
  listarPagamentosParciaisAcordoPendentes,
  listarPagamentosParciaisAcordoPorParcela,
} from "@/lib/server/pagamentos-parciais-acordo.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parcelaAcordoId = params.get("parcelaAcordoId");
  const pendentes = params.get("pendentes") === "true";

  return handleRoute(
    () => {
      if (pendentes) return listarPagamentosParciaisAcordoPendentes();
      if (parcelaAcordoId) return listarPagamentosParciaisAcordoPorParcela(parcelaAcordoId);
      return Promise.resolve([]);
    },
    200,
    pendentes ? PERFIS_STAFF : undefined
  );
}
