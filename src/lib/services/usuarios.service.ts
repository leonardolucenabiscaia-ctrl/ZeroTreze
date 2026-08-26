import type { PerfilUsuario, Usuario } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarUsuarios(): Promise<Usuario[]> {
  return apiFetch<Usuario[]>("/api/usuarios");
}

export async function listarUsuariosInternos(): Promise<Usuario[]> {
  return apiFetch<Usuario[]>("/api/usuarios?internos=true");
}

export async function buscarUsuarioPorId(id: string): Promise<Usuario | undefined> {
  return apiFetch<Usuario | null>(`/api/usuarios/${id}`).then((v) => v ?? undefined);
}

export async function atualizarUsuario(id: string, dados: Partial<Usuario>): Promise<Usuario> {
  return apiFetch<Usuario>(`/api/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(dados) });
}

export async function atualizarPerfilAcesso(id: string, perfil: PerfilUsuario): Promise<Usuario> {
  return atualizarUsuario(id, { perfil });
}

export async function excluirUsuario(id: string): Promise<void> {
  await apiFetch<null>(`/api/usuarios/${id}`, { method: "DELETE" });
}

export interface NovoUsuarioInternoInput {
  nome: string;
  email: string;
  telefone: string;
  perfil: "gestor" | "operador";
}

/**
 * Cadastra um novo gestor ou operador. O primeiro acesso funciona igual ao do cliente:
 * código de acesso enviado por WhatsApp, depois escolhe a própria senha.
 */
export async function criarUsuarioInterno(dados: NovoUsuarioInternoInput): Promise<Usuario> {
  return apiFetch<Usuario>("/api/usuarios", { method: "POST", body: JSON.stringify(dados) });
}
