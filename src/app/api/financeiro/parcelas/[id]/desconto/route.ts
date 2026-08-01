import type { NextRequest } from "next/server";
import { aplicarDescontoParcela } from "@/lib/server/financeiro.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const { desconto, usuarioNome } = await request.json();
    return aplicarDescontoParcela(id, desconto, usuarioNome);
  });
}
