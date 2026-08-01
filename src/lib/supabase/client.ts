import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para uso em componentes de cliente ("use client"). Usa a chave publicável —
 * segura para o navegador, mas respeita as políticas de RLS configuradas no banco. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
