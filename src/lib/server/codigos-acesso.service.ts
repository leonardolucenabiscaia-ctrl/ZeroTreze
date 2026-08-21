import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { whatsappProvider } from "@/lib/integrations/whatsapp";

const VALIDADE_MINUTOS = 15;

function hashCodigo(codigo: string): string {
  return crypto.createHash("sha256").update(codigo).digest("hex");
}

function gerarCodigoNumerico(): string {
  return String(crypto.randomInt(100000, 1000000));
}

/** Gera um código de 6 dígitos, guarda o hash dele (nunca o valor em texto puro) e manda via
 * WhatsApp pro telefone cadastrado do usuário. Lança erro se o usuário não tiver telefone
 * cadastrado ou se o envio falhar (ex.: WhatsApp fora do ar, template não aprovado). */
export async function gerarEEnviarCodigoAcesso(usuarioId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: usuarioRow } = await supabase.from("usuarios").select("telefone").eq("id", usuarioId).maybeSingle();
  if (!usuarioRow?.telefone) {
    throw new Error("Usuário sem telefone cadastrado — não é possível enviar o código por WhatsApp.");
  }

  const codigo = gerarCodigoNumerico();
  const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000).toISOString();

  const { error } = await supabase.from("codigos_acesso").insert({
    usuario_id: usuarioId,
    codigo_hash: hashCodigo(codigo),
    expira_em: expiraEm,
  });
  if (error) throw new Error(error.message);

  const { enviado } = await whatsappProvider.enviarCodigoAcesso(usuarioRow.telefone, codigo);
  if (!enviado) {
    throw new Error(
      "Não foi possível enviar o código de acesso por WhatsApp. Verifique se a integração está " +
        "configurada e se o template de mensagem já foi aprovado pela Meta."
    );
  }
}

/** Confere o código digitado contra o mais recente ainda válido (não expirado, não usado) desse
 * usuário — marca como usado só quando bate, pra não deixar o mesmo código ser reaproveitado. */
export async function verificarCodigoAcesso(usuarioId: string, codigoDigitado: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: codigoRow } = await supabase
    .from("codigos_acesso")
    .select("id, codigo_hash, expira_em, usado")
    .eq("usuario_id", usuarioId)
    .eq("usado", false)
    .gte("expira_em", new Date().toISOString())
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!codigoRow || codigoRow.codigo_hash !== hashCodigo(codigoDigitado)) {
    return false;
  }

  await supabase.from("codigos_acesso").update({ usado: true }).eq("id", codigoRow.id);
  return true;
}
