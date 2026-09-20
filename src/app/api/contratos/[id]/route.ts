import type { NextRequest } from "next/server";
import { atualizarContrato, buscarContratoPorId } from "@/lib/server/contratos.service";
import { handleRoute, PERFIS_ADMIN } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => buscarContratoPorId(id));
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
