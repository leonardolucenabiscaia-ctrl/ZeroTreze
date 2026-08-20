import type { NextRequest } from "next/server";
import { reenviarConviteCliente } from "@/lib/server/clientes.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      await reenviarConviteCliente(id);
      return null;
    },
    200,
    PERFIS_STAFF
  );
}
