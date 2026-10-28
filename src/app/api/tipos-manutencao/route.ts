import type { NextRequest } from "next/server";
import { criarTipoManutencao, listarTiposManutencao } from "@/lib/server/tipos-manutencao.service";
import { buscarUsuarioPorId } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => listarTiposManutencao(), 200, PERFIS_STAFF);
}

// Quem criou (pro catálogo) vem sempre da sessão — nunca do corpo da requisição.
export async function POST(request: NextRequest) {
  return handleRoute(
    async ({ userId }) => {
      const usuario = await buscarUsuarioPorId(userId);
      if (!usuario) throw new Error("Usuário não encontrado.");
      const { nome } = await request.json();
      if (typeof nome !== "string") throw new Error("Informe o nome do tipo de manutenção.");
      return criarTipoManutencao(nome, usuario.nome);
    },
    201,
    PERFIS_STAFF
  );
}
