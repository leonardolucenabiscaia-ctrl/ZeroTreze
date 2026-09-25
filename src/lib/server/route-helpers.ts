import "server-only";
import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { RateLimitError } from "./rate-limit.service";
import type { PerfilUsuario } from "@/lib/types";

/** Perfis internos (não-cliente) — atalho para restringir rotas administrativas. */
export const PERFIS_STAFF: PerfilUsuario[] = ["operador", "gestor", "administrador"];

/** Só o administrador — editar os dados cadastrais de clientes, veículos, contratos e acordos
 * (fora dos fluxos guiados com efeitos colaterais próprios, como confirmar pagamento ou encerrar
 * contrato) é restrito a esse perfil; gestor e operador continuam com acesso de leitura/operação
 * normal, só não editam esses dados cadastrais diretamente. */
export const PERFIS_ADMIN: PerfilUsuario[] = ["administrador"];

/** Sessão de quem está chamando a rota — passada pro callback do `handleRoute` pra quando a
 * checagem de permissão precisa saber QUEM está pedindo, não só "é da equipe?" (ex.: "esse
 * contrato pertence a esse cliente?"). */
export interface SessaoRota {
  userId: string;
  perfil: PerfilUsuario | undefined;
}

/** Roda a lógica de um Route Handler, devolvendo JSON de sucesso ou `{ error }` em caso de
 * exceção — evita repetir o mesmo try/catch em cada uma das rotas de `/api/*`.
 *
 * Sempre exige uma sessão válida do Supabase Auth (401 sem cookie de sessão) — o `proxy.ts`
 * protege a navegação por página, mas não intercepta `/api/*` (rotas de API cuidam da própria
 * autenticação, ex.: webhooks externos sem cookie de navegador). Passe `perfis` para restringir
 * a rota a perfis específicos (403 fora da lista) — ex.: recursos administrativos que um cliente
 * autenticado ainda assim não deveria conseguir chamar. O callback recebe a sessão de quem está
 * chamando, pra checagens mais finas (ex.: "só a equipe OU o dono desse recurso"). */
export async function handleRoute<T>(
  fn: (sessao: SessaoRota) => Promise<T>,
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

  const perfil = user.app_metadata?.perfil as PerfilUsuario | undefined;

  if (perfis) {
    if (!perfil || !perfis.includes(perfil)) {
      return NextResponse.json({ error: "Sem permissão para acessar este recurso." }, { status: 403 });
    }
  }

  try {
    const data = await fn({ userId: user.id, perfil });
    return NextResponse.json(data ?? null, { status: successStatus });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado." },
      { status: 400 }
    );
  }
}
