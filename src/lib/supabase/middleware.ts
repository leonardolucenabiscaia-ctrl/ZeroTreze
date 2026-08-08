import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Lê (e renova, se preciso) a sessão do Supabase a partir dos cookies da requisição, para uso
 * dentro de `src/proxy.ts`. Retorna a resposta já com os cookies atualizados — sempre repassar
 * esse `response`, nunca criar um `NextResponse.next()` novo no meio do caminho, senão os
 * cookies renovados se perdem.
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          // @supabase/ssr sempre grava maxAge (400 dias) por conta própria, ignorando qualquer
          // cookieOptions passado (bug confirmado lendo o código-fonte da versão instalada) —
          // removendo maxAge/expires aqui, o cookie vira um cookie de sessão de verdade
          // (apagado ao fechar o navegador) em vez de sobreviver ~400 dias.
          cookiesToSet.forEach(({ name, value, options }) => {
            const { maxAge: _maxAge, expires: _expires, ...semExpiracao } = options ?? {};
            response.cookies.set(name, value, semExpiracao);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
