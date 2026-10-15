import type { NextRequest } from "next/server";
import { alterarValorParcela } from "@/lib/server/financeiro.service";
import { buscarUsuarioPorId } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// Quem alterou o valor (pro log de auditoria) vem sempre da sessão — nunca do corpo da requisição.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async ({ userId }) => {
      const usuario = await buscarUsuarioPorId(userId);
      if (!usuario) throw new Error("Usuário não encontrado.");
      const { dados } = await request.json();
      return alterarValorParcela(id, dados, usuario.nome);
    },
    200,
    PERFIS_STAFF
  );
}
