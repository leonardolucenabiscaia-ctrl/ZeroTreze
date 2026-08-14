import type { NextRequest } from "next/server";
import { listarAuditoria, registrarAcao } from "@/lib/server/auditoria.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => listarAuditoria(), 200, PERFIS_STAFF);
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return registrarAcao(dados);
  }, 201, PERFIS_STAFF);
}
