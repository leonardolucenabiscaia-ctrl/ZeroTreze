import type { NextRequest } from "next/server";
import { atualizarStatusChamado } from "@/lib/server/chamados.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const { status } = await request.json();
    return atualizarStatusChamado(id, status);
  });
}
