export type StatusContrato = "em_dia" | "vence_em_breve" | "atraso" | "encerrado";

export interface AditivoContrato {
  id: string;
  tipo: "aditivo" | "renovacao";
  descricao: string;
  data: string;
  arquivoUrl: string;
}

export interface Contrato {
  id: string;
  numero: string;
  clienteId: string;
  veiculoId: string;
  status: StatusContrato;
  dataInicio: string;
  dataFim: string;
  valorParcela: number;
  valorCaucao: number;
  limiteRenovacao: number;
  arquivoUrl: string;
  aditivos: AditivoContrato[];
}
