import type { NextRequest } from "next/server";
import { z } from "zod";
import { atualizarQuilometragem } from "@/lib/server/veiculos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

const schemaQuilometragem = z.object({ quilometragem: z.number().finite().min(0) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      const { quilometragem } = schemaQuilometragem.parse(await request.json());
      return atualizarQuilometragem(id, quilometragem);
    },
    200,
    PERFIS_STAFF
  );
}
