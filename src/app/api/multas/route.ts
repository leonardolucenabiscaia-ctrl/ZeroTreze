import type { NextRequest } from "next/server";
import {
  criarMulta,
  listarMultas,
  listarMultasPendentesDeCienciaPorCliente,
  listarMultasPorContrato,
} from "@/lib/server/multas.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const contratoId = params.get("contratoId");
  const clientePendentesCienciaId = params.get("clientePendentesCienciaId");

  return handleRoute(async () => {
    if (contratoId) return await listarMultasPorContrato(contratoId);
    if (clientePendentesCienciaId) return await listarMultasPendentesDeCienciaPorCliente(clientePendentesCienciaId);
    return await listarMultas();
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return criarMulta(dados);
  }, 201);
}
