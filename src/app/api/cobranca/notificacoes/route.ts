import type { NextRequest } from "next/server";
import { enviarNotificacaoCobranca, listarNotificacoesCobranca } from "@/lib/server/cobranca.service";
import { buscarUsuarioPorId } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => listarNotificacoesCobranca(), 200, PERFIS_STAFF);
}

// Quem enviou a cobrança (pro log de auditoria) vem sempre da sessão — nunca do corpo.
export async function POST(request: NextRequest) {
  return handleRoute(async ({ userId }) => {
    const usuario = await buscarUsuarioPorId(userId);
    if (!usuario) throw new Error("Usuário não encontrado.");
    const { dados } = await request.json();
    return enviarNotificacaoCobranca(dados, usuario.nome);
  }, 201, PERFIS_STAFF);
}
