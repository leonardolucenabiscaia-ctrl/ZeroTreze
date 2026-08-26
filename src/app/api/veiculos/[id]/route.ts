import type { NextRequest } from "next/server";
import { atualizarVeiculo, buscarVeiculoPorId, excluirVeiculo } from "@/lib/server/veiculos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => buscarVeiculoPorId(id));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const dados = await request.json();
    return atualizarVeiculo(id, dados);
  }, 200, PERFIS_STAFF);
}

// Excluir veículo é definitivo e sensível o bastante pra restringir só a administrador —
// diferente do resto da rota, que aceita qualquer staff.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      await excluirVeiculo(id);
      return null;
    },
    200,
    ["administrador"]
  );
}
