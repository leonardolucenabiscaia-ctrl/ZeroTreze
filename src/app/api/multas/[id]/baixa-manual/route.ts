import type { NextRequest } from "next/server";
import { darBaixaManualMulta } from "@/lib/server/multas.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      const { dados, usuarioNome } = await request.json();
      return darBaixaManualMulta(id, dados, usuarioNome);
    },
    200,
    PERFIS_STAFF
  );
}
