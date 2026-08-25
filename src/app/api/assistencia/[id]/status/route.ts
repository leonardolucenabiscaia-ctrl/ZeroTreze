import type { NextRequest } from "next/server";
import { atualizarStatusSolicitacao } from "@/lib/server/assistencia.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      const { status } = await request.json();
      return atualizarStatusSolicitacao(id, status);
    },
    200,
    PERFIS_STAFF
  );
}
