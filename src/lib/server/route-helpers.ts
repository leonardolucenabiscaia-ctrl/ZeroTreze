import "server-only";
import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import type { PerfilUsuario } from "@/lib/types";

/** Perfis internos (não-cliente) — atalho para restringir rotas administrativas. */
export const PERFIS_STAFF: PerfilUsuario[] = ["operador", "gestor", "administrador"];

/** Roda a lógica de um Route Handler, devolvendo JSON de sucesso ou `{ error }` em caso de
 * exceção — evita repetir o mesmo try/catch em cada uma das rotas de `/api/*`.
 *
 * Sempre exige uma sessão válida do Supabase Auth (401 sem cookie de sessão) — o `proxy.ts`
 * protege a navegação por página, mas não intercepta `/api/*` (rotas de API cuidam da própria
 * autenticação, ex.: webhooks externos sem cookie de navegador). Passe `perfis` para restringir
 * a rota a perfis específicos (403 fora da lista) — ex.: recursos administrativos que um cliente
 * autenticado ainda assim não deveria conseguir chamar. */
export async function handleRoute<T>(
  fn: () => Promise<T>,
  successStatus = 200,
  perfis?: PerfilUsuario[]
): Promise<NextResponse> {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (perfis) {
    const perfil = user.app_metadata?.perfil as PerfilUsuario | undefined;
    if (!perfil || !perfis.includes(perfil)) {
      return NextResponse.json({ error: "Sem permissão para acessar este recurso." }, { status: 403 });
    }
  }

  try {
    const data = await fn();
    return NextResponse.json(data ?? null, { status: successStatus });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado." },
      { status: 400 }
    );
  }
}
