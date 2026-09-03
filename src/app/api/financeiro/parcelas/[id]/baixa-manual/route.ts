import type { NextRequest } from "next/server";
import { darBaixaManual } from "@/lib/server/financeiro.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const { dados, usuarioNome } = await request.json();
    return darBaixaManual(id, dados, usuarioNome);
  });
}
