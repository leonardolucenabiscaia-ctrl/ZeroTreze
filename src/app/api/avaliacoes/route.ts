import type { NextRequest } from "next/server";
import { criarAvaliacao } from "@/lib/server/avaliacoes.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return criarAvaliacao(dados);
  }, 201);
}
