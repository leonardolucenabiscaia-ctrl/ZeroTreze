import type { NextRequest } from "next/server";
import {
  listarParcelasAguardandoConfirmacao,
  listarParcelasPorContrato,
} from "@/lib/server/financeiro.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const contratoId = params.get("contratoId");
  const aguardandoConfirmacao = params.get("aguardandoConfirmacao") === "true";

  return handleRoute(() => {
    if (aguardandoConfirmacao) return listarParcelasAguardandoConfirmacao();
    if (contratoId) return listarParcelasPorContrato(contratoId);
    return Promise.resolve([]);
  });
}
