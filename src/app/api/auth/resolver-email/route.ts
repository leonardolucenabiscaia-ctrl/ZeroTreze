import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { aplicarRateLimit, obterIpCliente, RateLimitError } from "@/lib/server/rate-limit.service";

function normalizarDocumento(valor: string): string {
  return valor.replace(/\D/g, "");
}

const MENSAGEM_INVALIDA = "Credenciais inválidas. Verifique os dados informados.";
const MENSAGEM_RATE_LIMIT = "Muitas tentativas. Espere alguns minutos e tente de novo.";

/**
 * `supabase.auth.signInWithPassword` só aceita e-mail — esta rota resolve o identificador
 * (CPF, CNPJ ou e-mail) digitado no login para o e-mail real da conta, usando a chave secreta
 * (RLS nega tudo por padrão). Não distingue "não encontrado" de outros erros na mensagem, para
 * não vazar quais contas existem.
 *
 * Rota pública (chamada antes do login existir) — limita por IP pra dificultar alguém varrendo
 * CPFs em sequência tentando descobrir quais têm conta cadastrada.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const identificador = typeof body?.identificador === "string" ? body.identificador.trim() : "";

  if (!identificador) {
    return NextResponse.json({ error: MENSAGEM_INVALIDA }, { status: 400 });
  }

  try {
    await aplicarRateLimit(`resolver-email:ip:${obterIpCliente(request)}`, 20, 5 * 60);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: MENSAGEM_RATE_LIMIT }, { status: 429 });
    }
    throw error;
  }

  if (identificador.includes("@")) {
    return NextResponse.json({ email: identificador.toLowerCase() });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("email")
    .eq("cpf_cnpj", normalizarDocumento(identificador))
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: MENSAGEM_INVALIDA }, { status: 404 });
  }

  return NextResponse.json({ email: data.email });
}
