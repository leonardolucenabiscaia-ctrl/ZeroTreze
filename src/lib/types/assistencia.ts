export type TipoAssistencia =
  | "guincho"
  | "pane_mecanica"
  | "pane_eletrica"
  | "chaveiro"
  | "troca_pneu"
  | "acidente"
  | "bateria"
  | "falta_combustivel";

export type StatusAssistencia = "solicitado" | "a_caminho" | "em_atendimento" | "concluido" | "cancelado";

export interface SolicitacaoAssistencia {
  id: string;
  protocolo: string;
  clienteId: string;
  contratoId: string;
  tipo: TipoAssistencia;
  status: StatusAssistencia;
  latitude?: number;
  longitude?: number;
  tempoEstimadoMin: number;
  criadoEm: string;
}
