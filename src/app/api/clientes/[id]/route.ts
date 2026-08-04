import type { NextRequest } from "next/server";
import { atualizarCliente, buscarClientePorId, excluirCliente } from "@/lib/server/clientes.service";
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    await excluirCliente(id);
    return null;
  });
}
