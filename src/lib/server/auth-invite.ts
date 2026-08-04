import "server-only";
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
 * Cria a conta no Supabase Auth via convite por e-mail (`inviteUserByEmail`) — o usuário define
 * a própria senha ao clicar no link, em vez do administrador escolher uma senha por ele. O link
 * aponta para `/definir-senha` (precisa estar na lista de Redirect URLs do painel do Supabase).
 *
 * `inviteUserByEmail` só aceita `data` (vira `user_metadata`) — `perfil` precisa de uma segunda
 * chamada porque é `app_metadata` (só a API administrativa pode escrever ali, nunca o usuário).
 */
export async function convidarUsuario(
  supabase: ReturnType<typeof createAdminClient>,
  dados: ConvidarUsuarioInput
): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL não configurado.");

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(dados.email, {
    data: { nome: dados.nome, telefone: dados.telefone, cpf_cnpj: dados.cpfCnpj ?? "" },
    redirectTo: `${siteUrl}/definir-senha`,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Não foi possível enviar o convite por e-mail.");
  }

  const { error: metaError } = await supabase.auth.admin.updateUserById(data.user.id, {
    app_metadata: { perfil: dados.perfil },
  });
  if (metaError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(metaError.message);
  }

  return data.user.id;
}
