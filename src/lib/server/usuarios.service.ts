import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapUsuario } from "./mappers";
import type { PerfilUsuario, Usuario } from "@/lib/types";

export async function listarUsuarios(): Promise<Usuario[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("usuarios").select("*").order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapUsuario);
}

export async function listarUsuariosInternos(): Promise<Usuario[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .neq("perfil", "cliente")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapUsuario);
}

export async function buscarUsuarioPorId(id: string): Promise<Usuario | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("usuarios").select("*").eq("id", id).maybeSingle();
  return data ? mapUsuario(data) : undefined;
}

export async function atualizarUsuario(id: string, dados: Partial<Usuario>): Promise<Usuario> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (dados.nome !== undefined) patch.nome = dados.nome;
  if (dados.telefone !== undefined) patch.telefone = dados.telefone;
  if (dados.cpfCnpj !== undefined) patch.cpf_cnpj = dados.cpfCnpj;
  if (dados.fotoUrl !== undefined) patch.foto_url = dados.fotoUrl;
  if (dados.preferenciasNotificacao !== undefined) {
    patch.preferencias_notificacao = dados.preferenciasNotificacao;
  }

  if (dados.perfil !== undefined) {
    // perfil é a fonte de autorização (lido em app_metadata pelo proxy) — precisa sincronizar
    // no Auth, não só na tabela, senão o controle de acesso fica desatualizado.
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      app_metadata: { perfil: dados.perfil },
    });
    if (authError) throw new Error(authError.message);
    patch.perfil = dados.perfil;
  }

  const { data, error } = await supabase.from("usuarios").update(patch).eq("id", id).select().single();
  if (error || !data) throw new Error("Usuário não encontrado");
  return mapUsuario(data);
}

export async function atualizarPerfilAcesso(id: string, perfil: PerfilUsuario): Promise<Usuario> {
  return atualizarUsuario(id, { perfil });
}

export interface NovoUsuarioInternoInput {
  nome: string;
  email: string;
  telefone: string;
  perfil: "gestor" | "operador";
}

/**
 * Cadastra um novo gestor ou operador — cria a conta de verdade no Supabase Auth (senha padrão
 * de demonstração; o primeiro acesso funciona igual ao do cliente).
 */
export async function criarUsuarioInterno(dados: NovoUsuarioInternoInput): Promise<Usuario> {
  const supabase = createAdminClient();

  const { data: existente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", dados.email.toLowerCase())
    .maybeSingle();
  if (existente) throw new Error("Já existe uma conta cadastrada com esse e-mail.");

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: dados.email,
    password: "123456",
    email_confirm: true,
    user_metadata: { nome: dados.nome, telefone: dados.telefone },
    app_metadata: { perfil: dados.perfil },
  });
  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Não foi possível criar o usuário.");
  }

  const { data: usuarioRow, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", authData.user.id)
    .single();
  if (error || !usuarioRow) throw new Error("Usuário criado, mas não foi possível carregar o perfil.");
  return mapUsuario(usuarioRow);
}
