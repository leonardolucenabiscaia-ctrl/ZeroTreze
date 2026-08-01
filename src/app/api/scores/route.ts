import type { NextRequest } from "next/server";
import { buscarScorePorCliente, listarScores } from "@/lib/server/score.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const clienteId = request.nextUrl.searchParams.get("clienteId");
  return handleRoute(async () => (clienteId ? await buscarScorePorCliente(clienteId) : await listarScores()));
}
