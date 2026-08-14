import type { NextRequest } from "next/server";
import { atualizarRegraCobranca } from "@/lib/server/cobranca.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const dados = await request.json();
    return atualizarRegraCobranca(id, dados);
  }, 200, PERFIS_STAFF);
}
