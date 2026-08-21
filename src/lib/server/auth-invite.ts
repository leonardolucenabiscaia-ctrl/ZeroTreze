import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { gerarEEnviarCodigoAcesso } from "./codigos-acesso.service";
import type { PerfilUsuario } from "@/lib/types";

export interface ConvidarUsuarioInput {
  email: string;
  nome: string;
  telefone: string;
  cpfCnpj?: string;
  perfil: PerfilUsuario;
}

/**
 * Cria a conta no Supabase Auth e manda um CÓDIGO de acesso por WHATSAPP (não e-mail, não um
 * link clicável) — o usuário digita o código em `/definir-senha` e só então escolhe a própria
 * senha.
 *
 * Histórico: usava e-mail com link mágico, mas o Gmail abre automaticamente links de e-mail pra
 * escanear em busca de phishing, consumindo o token de uso único antes do clique real do
 * usuário. Trocado pra código digitado (imune a isso), e depois trocado de novo de e-mail (via
 * Resend) pra WhatsApp (2026-08-21) — a conta de hospedagem do cliente ficou instável dependendo
 * de configuração de DNS de terceiros pro e-mail funcionar, WhatsApp remove essa dependência.
 *
 * O envio em si é melhor esforço (não desfaz a criação da conta se falhar): a integração do
 * WhatsApp só manda mensagem de verdade pra qualquer cliente depois da revisão do app pela Meta
 * (enquanto isso não sai, todo envio automático de convite falha, e cancelar o cadastro do
 * cliente por causa disso travaria a operação inteira). O admin sempre pode reenviar manualmente
 * pelo botão "Enviar convite via WhatsApp" assim que a integração estiver funcionando.
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

  try {
    await gerarEEnviarCodigoAcesso(data.user.id);
  } catch (erroEnvio) {
    console.error("[auth-invite] Convite criado, mas envio do código falhou:", erroEnvio);
  }

  return data.user.id;
}

/** Reenvia o código de primeiro acesso por WhatsApp (mesmo mecanismo de `convidarUsuario`, sem
 * criar uma conta nova) — usado quando o convite original não chegou ao cliente. */
export async function reenviarCodigoAcesso(usuarioId: string): Promise<void> {
  await gerarEEnviarCodigoAcesso(usuarioId);
}
