import type { Notificacao } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarNotificacoesPorUsuario(usuarioId: string): Promise<Notificacao[]> {
  return apiFetch<Notificacao[]>(`/api/notificacoes?usuarioId=${usuarioId}`);
}

export async function marcarComoLida(notificacaoId: string): Promise<Notificacao> {
  return apiFetch<Notificacao>(`/api/notificacoes/${notificacaoId}/marcar-lida`, { method: "POST" });
}

export async function marcarTodasComoLidas(usuarioId: string): Promise<void> {
  await apiFetch<null>("/api/notificacoes/marcar-todas-lidas", {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}
