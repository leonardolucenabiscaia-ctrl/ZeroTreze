import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { atualizarSessao } from "@/lib/supabase/middleware";
import type { PerfilUsuario } from "@/lib/types";

const ROTAS_AUTH = ["/login", "/esqueci-senha", "/definir-senha"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await atualizarSessao(request);
  // `perfil` vem de app_metadata (só a API administrativa consegue definir — nunca o próprio
  // usuário), gravado ali exatamente para permitir essa checagem otimista sem consulta ao banco.
  const perfil = user?.app_metadata?.perfil as PerfilUsuario | undefined;

  // Página institucional (Início/Sobre Nós/Credenciamentos/Contato são âncoras dentro dela) e
  // robots.txt — sempre públicos, nunca redirecionam ninguém, esteja logado ou não (sem essa
  // exceção, os buscadores recebiam um redirect pra /login em vez das regras de indexação).
  if (pathname === "/" || pathname === "/robots.txt") {
    return response;
  }

  const rotaPublica = ROTAS_AUTH.some((rota) => pathname.startsWith(rota));

  if (rotaPublica) {
    if (user) {
      return NextResponse.redirect(
        new URL(perfil === "cliente" ? "/dashboard" : "/admin/dashboard", request.url)
      );
    }
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Páginas de impressão (ex.: contrato) podem ser acessadas por qualquer perfil autenticado,
  // já que tanto o cliente quanto o backoffice precisam gerar o documento.
  if (pathname.startsWith("/imprimir")) {
    return response;
  }

  const isRotaAdmin = pathname.startsWith("/admin");
  if (isRotaAdmin && perfil === "cliente") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!isRotaAdmin && perfil !== "cliente") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}

export const config = {
  // Além das rotas internas do Next, libera qualquer arquivo estático da pasta public/
  // (imagens, ícones etc.) — sem isso o proxy tratava esses arquivos como navegação de página.
  // "api/" também fica de fora: rotas de API (ex.: webhooks de integrações externas, como a
  // ClickSign) não têm cookie de sessão de navegador e devem cuidar da própria autenticação.
  matcher: ["/((?!_next/static|_next/image|api/|mock/|.*\\.(?:ico|png|jpe?g|webp|gif|svg|avif)$).*)"],
};
