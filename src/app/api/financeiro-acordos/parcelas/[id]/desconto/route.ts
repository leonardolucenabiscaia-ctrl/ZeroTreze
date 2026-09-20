import type { NextRequest } from "next/server";
import { aplicarDescontoParcelaAcordo } from "@/lib/server/financeiro-acordos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      const { desconto, usuarioNome } = await request.json();
      return aplicarDescontoParcelaAcordo(id, desconto, usuarioNome);
    },
    200,
    PERFIS_STAFF
  );
}
