import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapSolicitacaoAssistencia } from "./mappers";
import type { SolicitacaoAssistencia, TipoAssistencia } from "@/lib/types";

export async function solicitarAssistencia(dados: {
  clienteId: string;
  contratoId: string;
  tipo: TipoAssistencia;
  latitude?: number;
  longitude?: number;
}): Promise<SolicitacaoAssistencia> {
  const supabase = createAdminClient();
  const protocolo = `SOS-${Math.floor(100000 + Math.random() * 900000)}`;
  const tempoEstimadoMin = 20 + Math.floor(Math.random() * 25);

  const { data, error } = await supabase
    .from("solicitacoes_assistencia")
    .insert({
      protocolo,
      cliente_id: dados.clienteId,
      contrato_id: dados.contratoId,
      tipo: dados.tipo,
      status: "solicitado",
      latitude: dados.latitude ?? null,
      longitude: dados.longitude ?? null,
      tempo_estimado_min: tempoEstimadoMin,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível registrar a solicitação.");
  return mapSolicitacaoAssistencia(data);
}

export async function buscarSolicitacaoPorProtocolo(
  protocolo: string
): Promise<SolicitacaoAssistencia | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("solicitacoes_assistencia")
    .select("*")
    .eq("protocolo", protocolo)
    .maybeSingle();
  return data ? mapSolicitacaoAssistencia(data) : undefined;
}

export async function listarSolicitacoesPorCliente(clienteId: string): Promise<SolicitacaoAssistencia[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("solicitacoes_assistencia")
    .select("*")
    .eq("cliente_id", clienteId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSolicitacaoAssistencia);
}

export async function listarSolicitacoes(): Promise<SolicitacaoAssistencia[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("solicitacoes_assistencia").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSolicitacaoAssistencia);
}
