import type { NextRequest } from "next/server";
import { reenviarConviteCliente } from "@/lib/server/clientes.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";
import { aplicarRateLimit } from "@/lib/server/rate-limit.service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      // Evita spam de WhatsApp (e custo) pro mesmo cliente em caso de clique repetido/acidental.
      await aplicarRateLimit(`reenviar-convite:${id}`, 3, 10 * 60);
      await reenviarConviteCliente(id);
      return null;
    },
    200,
    PERFIS_STAFF
  );
}
