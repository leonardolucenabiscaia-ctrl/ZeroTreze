import type { Contrato } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarContratos(): Promise<Contrato[]> {
  return apiFetch<Contrato[]>("/api/contratos");
}

export async function listarContratosPorCliente(clienteId: string): Promise<Contrato[]> {
  return apiFetch<Contrato[]>(`/api/contratos?clienteId=${clienteId}`);
}

export async function buscarContratoPorId(id: string): Promise<Contrato | undefined> {
  return apiFetch<Contrato | null>(`/api/contratos/${id}`).then((v) => v ?? undefined);
}

export async function contratoAtivoPorCliente(clienteId: string): Promise<Contrato | undefined> {
  return apiFetch<Contrato | null>(`/api/contratos?clienteAtivoId=${clienteId}`).then((v) => v ?? undefined);
}

/** Um veículo só pode estar vinculado a um contrato ativo por vez (ver `criarContrato`). */
export async function contratoAtivoPorVeiculo(veiculoId: string): Promise<Contrato | undefined> {
  return apiFetch<Contrato | null>(`/api/contratos?veiculoAtivoId=${veiculoId}`).then((v) => v ?? undefined);
}

export interface NovoContratoInput {
  clienteId: string;
  veiculoId: string;
  valorSemanal: number;
  dataInicio: string;
  caucao: number;
  observacao?: string;
}

export async function criarContrato(dados: NovoContratoInput): Promise<Contrato> {
  return apiFetch<Contrato>("/api/contratos", { method: "POST", body: JSON.stringify(dados) });
}

export async function atualizarContrato(id: string, dados: Partial<Contrato>): Promise<Contrato> {
  return apiFetch<Contrato>(`/api/contratos/${id}`, { method: "PATCH", body: JSON.stringify(dados) });
}

export async function encerrarContrato(contratoId: string): Promise<Contrato> {
  return apiFetch<Contrato>(`/api/contratos/${contratoId}/encerrar`, { method: "POST" });
}

/** Exclusão definitiva do contrato e de tudo vinculado a ele (parcelas, extrato, multas, acordo,
 * documentos) — só pensada pra contratos criados errados. O servidor recusa se o contrato não
 * estiver encerrado ou se houver qualquer sinal de atividade financeira real. Se houver um acordo
 * vinculado mas sem nenhum pagamento nele, a primeira chamada lança um erro com prefixo
 * `ACORDO_SEM_ATIVIDADE:` — a tela pede confirmação extra e chama de novo com
 * `ignorarAcordoSemAtividade: true`. */
export async function excluirContrato(
  contratoId: string,
  opts: { ignorarAcordoSemAtividade?: boolean } = {}
): Promise<void> {
  const query = opts.ignorarAcordoSemAtividade ? "?ignorarAcordo=true" : "";
  await apiFetch<null>(`/api/contratos/${contratoId}${query}`, { method: "DELETE" });
}
