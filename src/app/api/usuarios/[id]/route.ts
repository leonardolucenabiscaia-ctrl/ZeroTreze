import type { NextRequest } from "next/server";
import { atualizarUsuario, buscarUsuarioPorId, excluirUsuario } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";
import { createSessionClient } from "@/lib/supabase/server";
import type { PerfilUsuario } from "@/lib/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => buscarUsuarioPorId(id), 200, PERFIS_STAFF);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    // Sem `perfis` no handleRoute porque essa rota também atende a página "Meu perfil" do
    // cliente (edita a própria conta) — mas isso não pode virar carta branca pra editar OUTRO
    // usuário qualquer. Só o próprio dono da conta ou alguém da equipe interna passa daqui.
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    const perfilLogado = user?.app_metadata?.perfil as PerfilUsuario | undefined;
    const ehStaff = !!perfilLogado && PERFIS_STAFF.includes(perfilLogado);
    if (!ehStaff && user?.id !== id) {
      throw new Error("Sem permissão para editar este usuário.");
    }

    const dados = await request.json();
    // Nível de acesso (perfil) só pode ser alterado por alguém da equipe interna, nunca pelo
    // próprio usuário editando o seu perfil — senão um cliente vira administrador sozinho.
    if (!ehStaff) delete dados.perfil;

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
