import type { NextRequest } from "next/server";
import {
  contratoAtivoPorCliente,
  contratoAtivoPorVeiculo,
  criarContrato,
  listarContratos,
  listarContratosPorCliente,
} from "@/lib/server/contratos.service";
import { handleRoute } from "@/lib/server/route-helpers";

// A criação de contrato gera o PDF e envia para assinatura na DocuSign — pode levar mais que o
// padrão de 10s da Vercel.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clienteId = params.get("clienteId");
  const clienteAtivoId = params.get("clienteAtivoId");
  const veiculoAtivoId = params.get("veiculoAtivoId");

  return handleRoute(async () => {
    if (clienteAtivoId) return await contratoAtivoPorCliente(clienteAtivoId);
    if (veiculoAtivoId) return await contratoAtivoPorVeiculo(veiculoAtivoId);
    if (clienteId) return await listarContratosPorCliente(clienteId);
    return await listarContratos();
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return criarContrato(dados);
  }, 201);
}
