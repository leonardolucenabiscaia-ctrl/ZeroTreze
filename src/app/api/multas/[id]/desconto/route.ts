import type { NextRequest } from "next/server";
import { aplicarDescontoMulta } from "@/lib/server/multas.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      const { desconto, usuarioNome } = await request.json();
      return aplicarDescontoMulta(id, desconto, usuarioNome);
    },
    200,
    PERFIS_STAFF
  );
}
