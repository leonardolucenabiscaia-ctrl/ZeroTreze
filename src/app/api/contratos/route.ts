import type { NextRequest } from "next/server";
import {
  contratoAtivoPorCliente,
  contratoAtivoPorVeiculo,
  criarContrato,
  listarContratos,
  listarContratosPorCliente,
  listarContratosPorVeiculo,
} from "@/lib/server/contratos.service";
import { handleRoute, podeAcessarCliente, PERFIS_STAFF } from "@/lib/server/route-helpers";

// A criação de contrato gera o PDF e envia para assinatura na ClickSign — pode levar mais que o
// padrão de 10s da Vercel.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clienteId = params.get("clienteId");
  const clienteAtivoId = params.get("clienteAtivoId");
  const veiculoAtivoId = params.get("veiculoAtivoId");
  const veiculoId = params.get("veiculoId");
  // Só `clienteId` (lista os contratos de um cliente específico) é usado pelo portal do próprio
  // cliente — os outros filtros (por veículo, ou a lista completa) são exclusivos do backoffice.
  return handleRoute(
    async (sessao) => {
      if (clienteId) {
        if (!(await podeAcessarCliente(sessao, clienteId))) {
          throw new Error("Sem permissão para acessar este recurso.");
        }
        return await listarContratosPorCliente(clienteId);
      }
      if (clienteAtivoId) return await contratoAtivoPorCliente(clienteAtivoId);
      if (veiculoAtivoId) return await contratoAtivoPorVeiculo(veiculoAtivoId);
      if (veiculoId) return await listarContratosPorVeiculo(veiculoId);
      return await listarContratos();
    },
    200,
    clienteId ? undefined : PERFIS_STAFF
  );
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return criarContrato(dados);
  }, 201, PERFIS_STAFF);
}
