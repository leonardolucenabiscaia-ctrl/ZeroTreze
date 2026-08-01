import type { NextRequest } from "next/server";
import { enviarNotificacaoCobranca, listarNotificacoesCobranca } from "@/lib/server/cobranca.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => listarNotificacoesCobranca());
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const { dados, usuarioNome } = await request.json();
    return enviarNotificacaoCobranca(dados, usuarioNome);
  }, 201);
}
