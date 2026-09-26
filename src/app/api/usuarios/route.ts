import type { NextRequest } from "next/server";
import { criarUsuarioInterno, listarUsuarios, listarUsuariosInternos } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// O envio do convite por WhatsApp pode levar mais que o padrão de 10s da Vercel.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const internos = request.nextUrl.searchParams.get("internos") === "true";
  return handleRoute(() => (internos ? listarUsuariosInternos() : listarUsuarios()), 200, PERFIS_STAFF);
}

export async function POST(request: NextRequest) {
  return handleRoute(async ({ perfil: perfilLogado }) => {
    const dados = await request.json();
    // Nível de acesso (perfil) só pode ser "administrador" quando quem está criando já é
    // administrador — senão um gestor/operador poderia se autopromover criando uma conta
    // administrador pra si mesmo (mesma regra já aplicada na edição, em usuarios/[id]).
    if (dados.perfil === "administrador" && perfilLogado !== "administrador") {
      throw new Error("Só um administrador pode criar outra conta de administrador.");
    }
    return criarUsuarioInterno(dados);
  }, 201, PERFIS_STAFF);
}
