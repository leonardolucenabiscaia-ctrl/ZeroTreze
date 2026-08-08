import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para uso EXCLUSIVO no servidor (Route Handlers, Server Components).
 * Usa a chave secreta, que ignora as políticas de RLS — nunca importar este arquivo a partir
 * de um componente "use client" (o pacote `server-only` faz o build falhar se isso acontecer).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Cliente que lê a sessão do usuário logado a partir dos cookies da requisição atual (chave
 * publicável) — para Route Handlers que precisam saber "quem está fazendo essa chamada agora"
 * (ex.: `/api/auth/perfil`). Diferente de `createAdminClient`, que não sabe quem está logado.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            // @supabase/ssr sempre grava maxAge (400 dias) por conta própria, ignorando
            // qualquer valor de cookieOptions passado aqui (bug confirmado lendo o código-fonte
            // da versão instalada) — removendo maxAge/expires do que repassamos ao Next.js, o
            // cookie vira um cookie de sessão de verdade (apagado ao fechar o navegador).
            cookiesToSet.forEach(({ name, value, options }) => {
              const { maxAge: _maxAge, expires: _expires, ...semExpiracao } = options ?? {};
              cookieStore.set(name, value, semExpiracao);
            });
          } catch {
            // Chamado a partir de um contexto que não pode escrever cookies (ex.: Server
            // Component) — sem problema, o proxy já cuida de renovar a sessão a cada navegação.
          }
        },
      },
    }
  );
}
