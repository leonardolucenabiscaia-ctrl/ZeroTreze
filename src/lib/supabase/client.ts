import { createBrowserClient } from "@supabase/ssr";

/**
 * Lê todos os cookies de `document.cookie` no formato que o @supabase/ssr espera.
 */
function lerTodosCookies() {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split("; ")
    .filter(Boolean)
    .map((par) => {
      const separador = par.indexOf("=");
      return { name: par.slice(0, separador), value: decodeURIComponent(par.slice(separador + 1)) };
    });
}

/**
 * Grava cookies em `document.cookie` SEM maxAge/expires, mesmo que o @supabase/ssr peça — a
 * versão instalada sempre define maxAge de 400 dias internamente e ignora qualquer cookieOptions
 * customizado (bug confirmado lendo o código-fonte da lib) — a única forma de neutralizar isso é
 * interceptar aqui e nunca deixar essa opção chegar em `document.cookie`. Sem Max-Age/Expires, o
 * cookie vira um cookie de sessão de verdade: o navegador o apaga ao ser fechado.
 */
function gravarTodosCookies(
  cookiesParaGravar: { name: string; value: string; options?: Record<string, unknown> }[]
) {
  cookiesParaGravar.forEach(({ name, value, options }) => {
    const partes = [`${name}=${encodeURIComponent(value)}`, `Path=${(options?.path as string) ?? "/"}`];
    const sameSite = (options?.sameSite as string) ?? "lax";
    partes.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
    if (options?.secure) partes.push("Secure");
    if (options?.domain) partes.push(`Domain=${options.domain as string}`);
    document.cookie = partes.join("; ");
  });
}

/** Cliente Supabase para uso em componentes de cliente ("use client"). Usa a chave publicável —
 * segura para o navegador, mas respeita as políticas de RLS configuradas no banco. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: lerTodosCookies,
        setAll: gravarTodosCookies,
      },
    }
  );
}
