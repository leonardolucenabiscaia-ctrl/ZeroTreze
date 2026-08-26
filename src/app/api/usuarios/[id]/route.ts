import type { NextRequest } from "next/server";
import { atualizarUsuario, buscarUsuarioPorId, excluirUsuario } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => buscarUsuarioPorId(id), 200, PERFIS_STAFF);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const dados = await request.json();
    return atualizarUsuario(id, dados);
  });
}

// Remover um usuário interno (administrador/gestor/operador) é sensível o bastante pra restringir
// só a administrador — diferente do resto da rota, que aceita qualquer staff.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      await excluirUsuario(id);
      return null;
    },
    200,
    ["administrador"]
  );
}
