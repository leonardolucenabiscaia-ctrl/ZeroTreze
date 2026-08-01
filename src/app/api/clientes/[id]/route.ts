import type { NextRequest } from "next/server";
import { atualizarCliente, buscarClientePorId } from "@/lib/server/clientes.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => buscarClientePorId(id));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const dados = await request.json();
    return atualizarCliente(id, dados);
  });
}
