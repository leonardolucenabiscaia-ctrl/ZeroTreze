import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verificarCodigoAcesso } from "@/lib/server/codigos-acesso.service";

const MENSAGEM_INVALIDA = "Código inválido ou expirado. Confira o código e tente de novo.";

/**
 * Confirma o código de acesso (enviado por WhatsApp) e já define a nova senha na mesma
 * chamada — rota pública, usada antes do login existir (sem sessão). Não distingue "e-mail não
 * encontrado" de "código errado" na mensagem, pra não vazar quais contas existem.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const codigo = typeof body?.codigo === "string" ? body.codigo.trim() : "";
  const novaSenha = typeof body?.novaSenha === "string" ? body.novaSenha : "";

  if (!email || !codigo || novaSenha.length < 6) {
    return NextResponse.json({ error: MENSAGEM_INVALIDA }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: usuarioRow } = await supabase.from("usuarios").select("id").eq("email", email).maybeSingle();
  if (!usuarioRow) {
    return NextResponse.json({ error: MENSAGEM_INVALIDA }, { status: 400 });
  }

  const codigoValido = await verificarCodigoAcesso(usuarioRow.id, codigo);
  if (!codigoValido) {
    return NextResponse.json({ error: MENSAGEM_INVALIDA }, { status: 400 });
  }

  const { error } = await supabase.auth.admin.updateUserById(usuarioRow.id, { password: novaSenha });
  if (error) {
    return NextResponse.json({ error: "Não foi possível definir a senha. Tente de novo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
