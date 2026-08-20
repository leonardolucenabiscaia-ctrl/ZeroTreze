import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { PerfilUsuario } from "@/lib/types";

export interface ConvidarUsuarioInput {
  email: string;
  nome: string;
  telefone: string;
  cpfCnpj?: string;
  perfil: PerfilUsuario;
}

/**
 * Cria a conta no Supabase Auth e manda um CÓDIGO de acesso por e-mail (não um link clicável) —
 * o usuário digita o código em `/definir-senha` e só então escolhe a própria senha.
 *
 * Por que código em vez de link: o fluxo original usava `inviteUserByEmail` (link mágico), mas
 * confirmado em produção (2026-08-04) que o Gmail abre automaticamente os links do e-mail pra
 * escanear em busca de phishing/malware — como o link da Supabase só pode ser usado uma vez, esse
 * acesso automático consumia o token antes do usuário clicar de verdade, sempre mostrando "link
 * expirado". Um código digitado manualmente é imune a isso (nenhum scanner "digita" nada).
 *
 * Também por isso não dá pra usar `inviteUserByEmail` (o template "Invite" da Supabase não
 * suporta a variável `{{ .Token }}` — só os templates "Magic Link/OTP", "Change Email" e
 * "Reauthentication" suportam). Por isso o fluxo é: cria o usuário direto (`admin.createUser`,
 * senha aleatória que nunca é usada) e dispara um OTP por e-mail (`signInWithOtp`), que usa o
 * template "Magic Link/OTP" — o mesmo mecanismo já usado pelo login por código do site.
 */
export async function convidarUsuario(
  supabase: ReturnType<typeof createAdminClient>,
  dados: ConvidarUsuarioInput
): Promise<string> {
  const senhaAleatoria = crypto.randomBytes(24).toString("base64url");

  const { data, error } = await supabase.auth.admin.createUser({
    email: dados.email,
    password: senhaAleatoria,
    email_confirm: true,
    user_metadata: { nome: dados.nome, telefone: dados.telefone, cpf_cnpj: dados.cpfCnpj ?? "" },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Não foi possível criar a conta do usuário.");
  }

  const { error: metaError } = await supabase.auth.admin.updateUserById(data.user.id, {
    app_metadata: { perfil: dados.perfil },
  });
  if (metaError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(metaError.message);
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: dados.email,
    options: { shouldCreateUser: false },
  });
  if (otpError) {
    console.error("[auth-invite] Falha ao enviar código de acesso:", JSON.stringify(otpError));
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(
      "Não foi possível enviar o código de acesso por e-mail. Se o Resend ainda estiver em modo " +
        "de teste, ele só entrega para o e-mail cadastrado na conta Resend — verifique um domínio " +
        "próprio para cadastrar outros destinatários."
    );
  }

  return data.user.id;
}

/** Reenvia o código de primeiro acesso por e-mail (mesmo mecanismo de `convidarUsuario`, sem
 * criar uma conta nova) — usado quando o e-mail original não chegou ao cliente. */
export async function reenviarCodigoAcesso(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    console.error("[auth-invite] Falha ao reenviar código de acesso:", JSON.stringify(error));
    throw new Error("Não foi possível reenviar o código de acesso por e-mail.");
  }
}
