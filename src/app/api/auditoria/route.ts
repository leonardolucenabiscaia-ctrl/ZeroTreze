import type { NextRequest } from "next/server";
import { listarAuditoria, registrarAcao } from "@/lib/server/auditoria.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => listarAuditoria());
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return registrarAcao(dados);
  }, 201);
}
