import type { NextRequest } from "next/server";
import { aplicarDescontoParcela } from "@/lib/server/financeiro.service";
import { buscarUsuarioPorId } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// Quem aplicou o desconto (pro log de auditoria) vem sempre da sessão — nunca do corpo da
// requisição, senão qualquer funcionário poderia atribuir a ação a outra pessoa.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async ({ userId }) => {
      const usuario = await buscarUsuarioPorId(userId);
      if (!usuario) throw new Error("Usuário não encontrado.");
      const { desconto } = await request.json();
      return aplicarDescontoParcela(id, desconto, usuario.nome);
    },
    200,
    PERFIS_STAFF
  );
}
