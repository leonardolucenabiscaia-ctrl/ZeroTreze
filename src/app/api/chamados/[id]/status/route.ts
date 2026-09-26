import type { NextRequest } from "next/server";
import { atualizarStatusChamado } from "@/lib/server/chamados.service";
import { handleRoute, podeAcessarChamado } from "@/lib/server/route-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async (sessao) => {
    if (!(await podeAcessarChamado(sessao, id))) throw new Error("Sem permissão para acessar este recurso.");
    const { status } = await request.json();
    return atualizarStatusChamado(id, status);
  });
}
