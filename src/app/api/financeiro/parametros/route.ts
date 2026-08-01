import type { NextRequest } from "next/server";
import { atualizarParametrosFinanceiros, obterParametrosFinanceiros } from "@/lib/server/financeiro.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => obterParametrosFinanceiros());
}

export async function PATCH(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return atualizarParametrosFinanceiros(dados);
  });
}
