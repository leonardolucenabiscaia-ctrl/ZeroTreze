import type { LogAuditoria } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function registrarAcao(dados: {
  usuarioId: string;
  usuarioNome: string;
  acao: string;
  entidade: string;
  entidadeId: string;
}): Promise<LogAuditoria> {
  return apiFetch<LogAuditoria>("/api/auditoria", { method: "POST", body: JSON.stringify(dados) });
}

export async function listarAuditoria(): Promise<LogAuditoria[]> {
  return apiFetch<LogAuditoria[]>("/api/auditoria");
}
