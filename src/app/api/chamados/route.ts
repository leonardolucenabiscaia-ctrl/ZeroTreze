import type { NextRequest } from "next/server";
import { criarChamado, listarChamados, listarChamadosPorCliente } from "@/lib/server/chamados.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const clienteId = request.nextUrl.searchParams.get("clienteId");
  return handleRoute(
    async () => (clienteId ? await listarChamadosPorCliente(clienteId) : await listarChamados()),
    200,
    clienteId ? undefined : PERFIS_STAFF
  );
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return criarChamado(dados);
  }, 201);
}
