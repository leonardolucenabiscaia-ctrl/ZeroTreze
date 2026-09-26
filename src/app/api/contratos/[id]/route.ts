import type { NextRequest } from "next/server";
import { atualizarContrato, buscarContratoPorId, excluirContrato } from "@/lib/server/contratos.service";
import { buscarClientePorUsuarioId } from "@/lib/server/clientes.service";
import { handleRoute, PERFIS_ADMIN, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async ({ userId, perfil }) => {
    const contrato = await buscarContratoPorId(id);
    if (!contrato) return contrato;
    // Equipe vê qualquer contrato; cliente só o próprio (por FK — nada de vazar contrato alheio
    // só por saber/adivinhar o ID).
    if (perfil && PERFIS_STAFF.includes(perfil)) return contrato;
    const cliente = await buscarClientePorUsuarioId(userId);
    if (!cliente || cliente.id !== contrato.clienteId) return undefined;
    return contrato;
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      const dados = await request.json();
      return atualizarContrato(id, dados);
    },
    200,
    PERFIS_ADMIN
  );
}

// Exclusão definitiva — restrita a administrador, igual à exclusão de veículo. As guardas de
// negócio (só encerrado, sem atividade financeira real) ficam em `excluirContrato`.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      await excluirContrato(id);
      return null;
    },
    200,
    PERFIS_ADMIN
  );
}
