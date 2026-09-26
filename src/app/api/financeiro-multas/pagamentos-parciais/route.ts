import type { NextRequest } from "next/server";
import {
  listarPagamentosParciaisMultaPendentes,
  listarPagamentosParciaisMultaPorMulta,
} from "@/lib/server/pagamentos-parciais-multa.service";
import { handleRoute, podeAcessarMulta, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const multaId = params.get("multaId");
  const pendentes = params.get("pendentes") === "true";

  return handleRoute(
    async (sessao) => {
      if (pendentes) return listarPagamentosParciaisMultaPendentes();
      if (multaId) {
        if (!(await podeAcessarMulta(sessao, multaId))) {
          throw new Error("Sem permissão para acessar este recurso.");
        }
        return listarPagamentosParciaisMultaPorMulta(multaId);
      }
      return Promise.resolve([]);
    },
    200,
    pendentes ? PERFIS_STAFF : undefined
  );
}
