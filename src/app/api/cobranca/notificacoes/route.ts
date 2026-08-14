import type { NextRequest } from "next/server";
import { enviarNotificacaoCobranca, listarNotificacoesCobranca } from "@/lib/server/cobranca.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => listarNotificacoesCobranca(), 200, PERFIS_STAFF);
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const { dados, usuarioNome } = await request.json();
    return enviarNotificacaoCobranca(dados, usuarioNome);
  }, 201, PERFIS_STAFF);
}
