import type { NextRequest } from "next/server";
import { criarUsuarioInterno, listarUsuarios, listarUsuariosInternos } from "@/lib/server/usuarios.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const internos = request.nextUrl.searchParams.get("internos") === "true";
  return handleRoute(() => (internos ? listarUsuariosInternos() : listarUsuarios()));
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return criarUsuarioInterno(dados);
  }, 201);
}
