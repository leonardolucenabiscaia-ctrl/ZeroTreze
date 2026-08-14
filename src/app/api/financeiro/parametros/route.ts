import type { NextRequest } from "next/server";
import { atualizarParametrosFinanceiros, obterParametrosFinanceiros } from "@/lib/server/financeiro.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// GET fica aberto a qualquer usuário autenticado — o dashboard do cliente lê os parâmetros pra
// calcular juros/multa da própria fatura. Só a alteração dos parâmetros é administrativa.
export async function GET() {
  return handleRoute(() => obterParametrosFinanceiros());
}

export async function PATCH(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return atualizarParametrosFinanceiros(dados);
  }, 200, PERFIS_STAFF);
}
