import "server-only";
import { NextResponse } from "next/server";
import { createSessionClient, createAdminClient } from "@/lib/supabase/server";
import { RateLimitError } from "./rate-limit.service";
import { buscarClientePorUsuarioId } from "./clientes.service";
import { buscarContratoPorId, listarContratosPorCliente } from "./contratos.service";
import { buscarChamadoPorId } from "./chamados.service";
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

/** Confirma que quem está chamando é da equipe OU é o próprio dono desse `clienteId` — usado nas
 * rotas que aceitam um `clienteId` (ou algo que leva até um) como filtro de consulta, pra um
 * cliente autenticado não conseguir ler/agir sobre o registro de OUTRO cliente só trocando o id
 * na URL (a mesma proteção que as rotas `GET /recurso/[id]` já faziam comparando o dono, agora
 * também para as rotas que filtram "por cliente" em vez de buscar por id direto). */
export async function podeAcessarCliente(sessao: SessaoRota, clienteId: string): Promise<boolean> {
  if (sessao.perfil && PERFIS_STAFF.includes(sessao.perfil)) return true;
  const cliente = await buscarClientePorUsuarioId(sessao.userId);
  return !!cliente && cliente.id === clienteId;
}

/** Mesma ideia de `podeAcessarCliente`, mas quando o recurso está identificado por
 * `usuarioId` (ex.: notificações) em vez de `clienteId`. */
export function podeAcessarUsuario(sessao: SessaoRota, usuarioId: string): boolean {
  return (!!sessao.perfil && PERFIS_STAFF.includes(sessao.perfil)) || sessao.userId === usuarioId;
}

/** Mesma ideia de `podeAcessarCliente`, mas quando a rota recebe um `contratoId` em vez do
 * `clienteId` direto (parcelas, extrato, multas por contrato) — busca o contrato e confere se o
 * `clienteId` dele é o da própria sessão. Contrato inexistente também nega acesso (o service que
 * de fato lista os dados vai devolver vazio de qualquer forma). */
export async function podeAcessarContrato(sessao: SessaoRota, contratoId: string): Promise<boolean> {
  if (sessao.perfil && PERFIS_STAFF.includes(sessao.perfil)) return true;
  const contrato = await buscarContratoPorId(contratoId);
  if (!contrato) return false;
  return podeAcessarCliente(sessao, contrato.clienteId);
}

/** Mesma ideia, mas a partir de uma parcela de contrato (financeiro normal) — resolve o
 * `contrato_id` dela primeiro. */
export async function podeAcessarParcela(sessao: SessaoRota, parcelaId: string): Promise<boolean> {
  if (sessao.perfil && PERFIS_STAFF.includes(sessao.perfil)) return true;
  const supabase = createAdminClient();
  const { data } = await supabase.from("parcelas").select("contrato_id").eq("id", parcelaId).maybeSingle();
  if (!data) return false;
  return podeAcessarContrato(sessao, data.contrato_id as string);
}

/** Mesma ideia, mas a partir de uma parcela de ACORDO — resolve parcela → acordo → contrato_id. */
export async function podeAcessarParcelaAcordo(sessao: SessaoRota, parcelaAcordoId: string): Promise<boolean> {
  if (sessao.perfil && PERFIS_STAFF.includes(sessao.perfil)) return true;
  const supabase = createAdminClient();
  const { data: parcela } = await supabase
    .from("parcelas_acordo")
    .select("acordo_id")
    .eq("id", parcelaAcordoId)
    .maybeSingle();
  if (!parcela) return false;
  const { data: acordo } = await supabase
    .from("acordos")
    .select("contrato_id")
    .eq("id", parcela.acordo_id as string)
    .maybeSingle();
  if (!acordo) return false;
  return podeAcessarContrato(sessao, acordo.contrato_id as string);
}

/** Mesma ideia, mas a partir de uma multa — resolve o `contrato_id` dela. */
export async function podeAcessarMulta(sessao: SessaoRota, multaId: string): Promise<boolean> {
  if (sessao.perfil && PERFIS_STAFF.includes(sessao.perfil)) return true;
  const supabase = createAdminClient();
  const { data } = await supabase.from("multas").select("contrato_id").eq("id", multaId).maybeSingle();
  if (!data) return false;
  return podeAcessarContrato(sessao, data.contrato_id as string);
}

/** Confirma que quem está chamando é da equipe OU é o dono do chamado (comparando
 * `chamado.clienteId` com o cliente da própria sessão). */
export async function podeAcessarChamado(sessao: SessaoRota, chamadoId: string): Promise<boolean> {
  if (sessao.perfil && PERFIS_STAFF.includes(sessao.perfil)) return true;
  const chamado = await buscarChamadoPorId(chamadoId);
  if (!chamado) return false;
  return podeAcessarCliente(sessao, chamado.clienteId);
}

/** Um veículo não pertence a um cliente diretamente — pertence via contrato. Um cliente só pode
 * acessar um veículo que já esteve (ou está) vinculado a algum contrato seu. */
export async function podeAcessarVeiculo(sessao: SessaoRota, veiculoId: string): Promise<boolean> {
  if (sessao.perfil && PERFIS_STAFF.includes(sessao.perfil)) return true;
  const cliente = await buscarClientePorUsuarioId(sessao.userId);
  if (!cliente) return false;
  const contratos = await listarContratosPorCliente(cliente.id);
  return contratos.some((c) => c.veiculoId === veiculoId);
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
