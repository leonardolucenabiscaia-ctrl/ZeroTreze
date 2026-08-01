export type StatusParcela = "pago" | "em_aberto" | "vencido" | "aguardando_confirmacao";

/** Desconto concedido pelo administrador sobre uma parcela — as três formas podem ser combinadas. */
export interface DescontoParcela {
  /** 100% de desconto sobre a multa por atraso. */
  descontarMulta: boolean;
  /** Percentual de desconto (0-100) sobre o valor atualizado da parcela. */
  percentual?: number;
  /** Valor fixo, em reais, abatido do valor atualizado da parcela. */
  valorFixo?: number;
  aplicadoPorNome: string;
  aplicadoEm: string;
}

export interface Parcela {
  id: string;
  contratoId: string;
  numero: number;
  competencia: string;
  valorOriginal: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusParcela;
  formaPagamento?: "pix" | "boleto";
  /** Momento em que o cliente enviou o comprovante, aguardando confirmação do administrador. */
  dataEnvioComprovante?: string;
  desconto?: DescontoParcela;
}

export interface ValorAtualizadoParcela {
  diasAtraso: number;
  juros: number;
  multa: number;
  correcao: number;
  valorFinal: number;
}
