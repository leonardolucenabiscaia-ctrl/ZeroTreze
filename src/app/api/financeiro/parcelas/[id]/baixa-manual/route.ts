import type { NextRequest } from "next/server";
import { darBaixaManual } from "@/lib/server/financeiro.service";
import { buscarUsuarioPorId } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// Quem deu a baixa (pro log de auditoria) vem sempre da sessão — nunca do corpo da requisição.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async ({ userId }) => {
      const usuario = await buscarUsuarioPorId(userId);
      if (!usuario) throw new Error("Usuário não encontrado.");
      const { dados } = await request.json();
      return darBaixaManual(id, dados, usuario.nome);
    },
    200,
    PERFIS_STAFF
  );
}
