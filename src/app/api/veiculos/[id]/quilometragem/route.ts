import type { NextRequest } from "next/server";
import { atualizarQuilometragem } from "@/lib/server/veiculos.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const { quilometragem } = await request.json();
    return atualizarQuilometragem(id, Number(quilometragem));
  });
}
