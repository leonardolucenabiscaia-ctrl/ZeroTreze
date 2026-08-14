import type { NextRequest } from "next/server";
import {
  buscarSolicitacaoPorProtocolo,
  listarSolicitacoes,
  listarSolicitacoesPorCliente,
  solicitarAssistencia,
} from "@/lib/server/assistencia.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const protocolo = params.get("protocolo");
  const clienteId = params.get("clienteId");
  const semFiltro = !protocolo && !clienteId;

  return handleRoute(
    async () => {
      if (protocolo) return await buscarSolicitacaoPorProtocolo(protocolo);
      if (clienteId) return await listarSolicitacoesPorCliente(clienteId);
      return await listarSolicitacoes();
    },
    200,
    semFiltro ? PERFIS_STAFF : undefined
  );
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return solicitarAssistencia(dados);
  }, 201);
}
