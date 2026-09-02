import type { NextRequest } from "next/server";
import {
  listarParcelasAguardandoConfirmacao,
  listarParcelasPorContrato,
  listarTodasAsParcelas,
} from "@/lib/server/financeiro.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const contratoId = params.get("contratoId");
  const aguardandoConfirmacao = params.get("aguardandoConfirmacao") === "true";
  const todas = params.get("todas") === "true";

  return handleRoute(
    () => {
      if (aguardandoConfirmacao) return listarParcelasAguardandoConfirmacao();
      if (todas) return listarTodasAsParcelas();
      if (contratoId) return listarParcelasPorContrato(contratoId);
      return Promise.resolve([]);
    },
    200,
    aguardandoConfirmacao || todas ? PERFIS_STAFF : undefined
  );
}
