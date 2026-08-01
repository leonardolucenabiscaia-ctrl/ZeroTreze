import type { Cliente } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarClientes(): Promise<Cliente[]> {
  return apiFetch<Cliente[]>("/api/clientes");
}

export async function buscarClientePorId(id: string): Promise<Cliente | undefined> {
  return apiFetch<Cliente | null>(`/api/clientes/${id}`).then((v) => v ?? undefined);
}

export async function buscarClientePorUsuarioId(usuarioId: string): Promise<Cliente | undefined> {
  return apiFetch<Cliente | null>(`/api/clientes?usuarioId=${usuarioId}`).then((v) => v ?? undefined);
}

export async function atualizarCliente(id: string, dados: Partial<Cliente>): Promise<Cliente> {
  return apiFetch<Cliente>(`/api/clientes/${id}`, { method: "PATCH", body: JSON.stringify(dados) });
}

export interface NovoClienteInput {
  nomeCompleto: string;
  email: string;
  cpf: string;
  rg: string;
  nacionalidade: string;
  profissao: string;
  telefone: string;
  dataNascimento: string;
  cnhNumero: string;
  cnhValidade: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  anexos: File[];
}

export async function criarCliente(dados: NovoClienteInput): Promise<Cliente> {
  const formData = new FormData();
  formData.append("nomeCompleto", dados.nomeCompleto);
  formData.append("email", dados.email);
  formData.append("cpf", dados.cpf);
  formData.append("rg", dados.rg);
  formData.append("nacionalidade", dados.nacionalidade);
  formData.append("profissao", dados.profissao);
  formData.append("telefone", dados.telefone);
  formData.append("dataNascimento", dados.dataNascimento);
  formData.append("cnhNumero", dados.cnhNumero);
  formData.append("cnhValidade", dados.cnhValidade);
  formData.append("cep", dados.cep);
  formData.append("endereco", dados.endereco);
  formData.append("numero", dados.numero);
  if (dados.complemento) formData.append("complemento", dados.complemento);
  formData.append("bairro", dados.bairro);
  formData.append("cidade", dados.cidade);
  formData.append("uf", dados.uf);
  dados.anexos.forEach((arquivo) => formData.append("anexos", arquivo));

  return apiFetch<Cliente>("/api/clientes", { method: "POST", body: formData });
}
