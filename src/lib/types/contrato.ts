export type StatusContrato = "em_dia" | "vence_em_breve" | "atraso" | "encerrado";

export interface AditivoContrato {
  id: string;
  tipo: "aditivo" | "renovacao";
  descricao: string;
  data: string;
  arquivoUrl: string;
}

/** Status da solicitação de assinatura eletrônica na AssinaDoc — string livre porque reflete
 * exatamente o que a API deles envia (ex.: "Pending", "Open", "Signed", "Refused"). */
export interface AssinaturaContrato {
  status: string;
  requestId: number;
  documentKey: string;
  signingKey: string;
  enviadoEm: string;
  atualizadoEm?: string;
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
  /** Ausente se o envio para assinatura ainda não foi feito ou falhou (não bloqueia o contrato). */
  assinatura?: AssinaturaContrato;
}
