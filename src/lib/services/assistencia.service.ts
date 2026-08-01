import type { SolicitacaoAssistencia, TipoAssistencia } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function solicitarAssistencia(dados: {
  clienteId: string;
  contratoId: string;
  tipo: TipoAssistencia;
  latitude?: number;
  longitude?: number;
}): Promise<SolicitacaoAssistencia> {
  return apiFetch<SolicitacaoAssistencia>("/api/assistencia", { method: "POST", body: JSON.stringify(dados) });
}

export async function buscarSolicitacaoPorProtocolo(
  protocolo: string
): Promise<SolicitacaoAssistencia | undefined> {
  return apiFetch<SolicitacaoAssistencia | null>(`/api/assistencia?protocolo=${protocolo}`).then(
    (v) => v ?? undefined
  );
}

export async function listarSolicitacoesPorCliente(clienteId: string): Promise<SolicitacaoAssistencia[]> {
  return apiFetch<SolicitacaoAssistencia[]>(`/api/assistencia?clienteId=${clienteId}`);
}

export async function listarSolicitacoes(): Promise<SolicitacaoAssistencia[]> {
  return apiFetch<SolicitacaoAssistencia[]>("/api/assistencia");
}
