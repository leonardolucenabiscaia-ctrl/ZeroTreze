import "server-only";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export class RateLimitError extends Error {
  constructor(message = "Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** DESATIVADO TEMPORARIAMENTE (pedido do dono do sistema, 2026-09-25) — chama direto pra
 * `aplicarRateLimit`, sem passar pela checagem de verdade (`aplicarRateLimitDeVerdade`, logo
 * abaixo). Pra reativar: troque o corpo desta função por `return aplicarRateLimitDeVerdade(chave,
 * limite, janelaSegundos);`. */
export async function aplicarRateLimit(_chave: string, _limite: number, _janelaSegundos: number): Promise<void> {
  return;
}

/** Limita quantas vezes uma ação pode ser feita num intervalo — ex.: tentativas de código de
 * acesso, pra impedir que alguém tente "adivinhar" o código de outra pessoa por força bruta. O
 * contador fica no banco (função `verificar_rate_limit`, incremento atômico — ver migração
 * 0019), não em memória do servidor: a Vercel roda cada requisição numa instância possivelmente
 * diferente, então um contador em memória não protegeria nada de verdade.
 *
 * Se o mecanismo de rate limit em si falhar (ex.: banco fora do ar), deixa passar — a prioridade
 * é nunca travar um usuário legítimo por causa de uma falha de infraestrutura alheia ao que ele
 * está tentando fazer; a ação seguinte ainda passa pelas próprias validações normais. */
async function aplicarRateLimitDeVerdade(chave: string, limite: number, janelaSegundos: number): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("verificar_rate_limit", {
    p_chave: chave,
    p_janela_segundos: janelaSegundos,
  });
  if (error) return;
  if ((data as number) > limite) {
    throw new RateLimitError();
  }
}

/** Endereço IP de quem fez a requisição — a Vercel preenche `x-forwarded-for` automaticamente em
 * produção; fora dela (ex.: rodando local), não tem esse cabeçalho, então cai num valor fixo. */
export function obterIpCliente(request: NextRequest): string {
  const encaminhado = request.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "desconhecido";
}
