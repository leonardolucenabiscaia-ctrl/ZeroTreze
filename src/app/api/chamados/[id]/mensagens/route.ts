import type { NextRequest } from "next/server";
import { buscarChamadoPorId, enviarMensagem } from "@/lib/server/chamados.service";
import { buscarClientePorUsuarioId } from "@/lib/server/clientes.service";
import { buscarUsuarioPorId } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// O autor da mensagem (nome/perfil) vem sempre da sessão de quem está logado — nunca do corpo da
// requisição — senão qualquer pessoa poderia mandar mensagem se passando por outra (inclusive por
// "suporte") em um chamado de outro cliente.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async ({ userId, perfil }) => {
      const chamado = await buscarChamadoPorId(id);
      if (!chamado) throw new Error("Chamado não encontrado.");

      const ehStaff = !!perfil && PERFIS_STAFF.includes(perfil);
      if (!ehStaff) {
        const cliente = await buscarClientePorUsuarioId(userId);
        if (!cliente || cliente.id !== chamado.clienteId) {
          throw new Error("Chamado não encontrado.");
        }
      }

      const usuario = await buscarUsuarioPorId(userId);
      if (!usuario) throw new Error("Usuário não encontrado.");

      const { texto } = await request.json();
      return enviarMensagem(id, { autorId: usuario.id, autorNome: usuario.nome, autorPerfil: usuario.perfil }, texto);
    },
    201
  );
}
