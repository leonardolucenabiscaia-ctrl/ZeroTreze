import type { NextRequest } from "next/server";
import type { Parcela } from "@/lib/types";
import {
  listarParcelasAguardandoConfirmacao,
  listarParcelasAtivas,
  listarParcelasPagas,
  listarParcelasPorContrato,
  listarTodasAsParcelas,
  somaValorPago,
} from "@/lib/server/financeiro.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const contratoId = params.get("contratoId");
  const aguardandoConfirmacao = params.get("aguardandoConfirmacao") === "true";
  const ativas = params.get("ativas") === "true";
  const pagas = params.get("pagas") === "true";
  const somaPaga = params.get("somaPaga") === "true";
  const todas = params.get("todas") === "true";

  const rotaAdmin = aguardandoConfirmacao || ativas || pagas || somaPaga || todas;

  return handleRoute(
    (): Promise<Parcela[] | number> => {
      if (aguardandoConfirmacao) return listarParcelasAguardandoConfirmacao();
      if (ativas) return listarParcelasAtivas();
      if (pagas) return listarParcelasPagas();
      if (somaPaga) return somaValorPago();
      if (todas) return listarTodasAsParcelas();
      if (contratoId) return listarParcelasPorContrato(contratoId);
      return Promise.resolve([]);
    },
    200,
    rotaAdmin ? PERFIS_STAFF : undefined
  );
}
