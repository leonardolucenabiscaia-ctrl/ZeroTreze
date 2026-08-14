import type { NextRequest } from "next/server";
import { criarUsuarioInterno, listarUsuarios, listarUsuariosInternos } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// O envio do convite por e-mail (SMTP) pode levar mais que o padrão de 10s da Vercel.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const internos = request.nextUrl.searchParams.get("internos") === "true";
  return handleRoute(() => (internos ? listarUsuariosInternos() : listarUsuarios()), 200, PERFIS_STAFF);
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const dados = await request.json();
    return criarUsuarioInterno(dados);
  }, 201, PERFIS_STAFF);
}
