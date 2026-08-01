import type { NextRequest } from "next/server";
import { enviarMensagem } from "@/lib/server/chamados.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const { autor, texto } = await request.json();
    return enviarMensagem(id, autor, texto);
  }, 201);
}
