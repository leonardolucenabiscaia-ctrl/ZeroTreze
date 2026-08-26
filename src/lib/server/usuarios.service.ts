import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { convidarUsuario } from "./auth-invite";
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

/** Apaga a conta definitivamente (Supabase Auth, em cascata via FK apaga a linha em `usuarios` e
 * tudo que depende dela — notificações, auditoria etc.). Ação irreversível — a confirmação fica
 * a cargo da UI. */
export async function excluirUsuario(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
}

export interface NovoUsuarioInternoInput {
  nome: string;
  email: string;
  telefone: string;
  perfil: "gestor" | "operador";
}

/**
 * Cadastra um novo gestor ou operador — convida por WhatsApp (ver `convidarUsuario`), sem senha
 * definida pelo administrador; o usuário escolhe a própria senha ao aceitar o convite.
 */
export async function criarUsuarioInterno(dados: NovoUsuarioInternoInput): Promise<Usuario> {
  const supabase = createAdminClient();

  const { data: existente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", dados.email.toLowerCase())
    .maybeSingle();
  if (existente) throw new Error("Já existe uma conta cadastrada com esse e-mail.");

  const usuarioId = await convidarUsuario(supabase, {
    email: dados.email,
    nome: dados.nome,
    telefone: dados.telefone,
    perfil: dados.perfil,
  });

  const { data: usuarioRow, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", usuarioId)
    .single();
  if (error || !usuarioRow) throw new Error("Usuário convidado, mas não foi possível carregar o perfil.");
  return mapUsuario(usuarioRow);
}
