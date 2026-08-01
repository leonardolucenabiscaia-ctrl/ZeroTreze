import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function normalizarDocumento(valor: string): string {
  return valor.replace(/\D/g, "");
}

const MENSAGEM_INVALIDA = "Credenciais inválidas. Verifique os dados informados.";

/**
 * `supabase.auth.signInWithPassword` só aceita e-mail — esta rota resolve o identificador
 * (CPF, CNPJ ou e-mail) digitado no login para o e-mail real da conta, usando a chave secreta
 * (RLS nega tudo por padrão). Não distingue "não encontrado" de outros erros na mensagem, para
 * não vazar quais contas existem.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const identificador = typeof body?.identificador === "string" ? body.identificador.trim() : "";

  if (!identificador) {
    return NextResponse.json({ error: MENSAGEM_INVALIDA }, { status: 400 });
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
