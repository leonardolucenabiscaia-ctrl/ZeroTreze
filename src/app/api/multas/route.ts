import type { NextRequest } from "next/server";
import {
  criarMulta,
  listarMultas,
  listarMultasPendentesDeCienciaPorCliente,
  listarMultasPorContrato,
} from "@/lib/server/multas.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const contratoId = params.get("contratoId");
  const clientePendentesCienciaId = params.get("clientePendentesCienciaId");
  const semFiltro = !contratoId && !clientePendentesCienciaId;

  return handleRoute(
    async () => {
      if (contratoId) return await listarMultasPorContrato(contratoId);
      if (clientePendentesCienciaId) return await listarMultasPendentesDeCienciaPorCliente(clientePendentesCienciaId);
      return await listarMultas();
    },
    200,
    semFiltro ? PERFIS_STAFF : undefined
  );
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return criarMulta(dados);
  }, 201, PERFIS_STAFF);
}
