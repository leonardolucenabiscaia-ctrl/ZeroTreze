import type { CategoriaChamado, Chamado, Mensagem, PrioridadeChamado } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarChamados(): Promise<Chamado[]> {
  return apiFetch<Chamado[]>("/api/chamados");
}

export async function listarChamadosPorCliente(clienteId: string): Promise<Chamado[]> {
  return apiFetch<Chamado[]>(`/api/chamados?clienteId=${clienteId}`);
}

export async function buscarChamadoPorId(id: string): Promise<Chamado | undefined> {
  return apiFetch<Chamado | null>(`/api/chamados/${id}`).then((v) => v ?? undefined);
}

export async function criarChamado(dados: {
  clienteId: string;
  clienteNome: string;
  contratoId?: string;
  categoria: CategoriaChamado;
  titulo: string;
  prioridade: PrioridadeChamado;
  mensagemInicial: string;
}): Promise<Chamado> {
  return apiFetch<Chamado>("/api/chamados", { method: "POST", body: JSON.stringify(dados) });
}

export async function enviarMensagem(
  chamadoId: string,
  autor: Pick<Mensagem, "autorId" | "autorNome" | "autorPerfil">,
  texto: string
): Promise<Mensagem> {
  return apiFetch<Mensagem>(`/api/chamados/${chamadoId}/mensagens`, {
    method: "POST",
    body: JSON.stringify({ autor, texto }),
  });
}

export async function atualizarStatusChamado(chamadoId: string, status: Chamado["status"]): Promise<Chamado> {
  return apiFetch<Chamado>(`/api/chamados/${chamadoId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
