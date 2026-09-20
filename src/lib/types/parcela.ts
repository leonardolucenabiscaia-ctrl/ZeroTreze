export type StatusParcela = "pago" | "em_aberto" | "vencido" | "aguardando_confirmacao" | "renegociado";

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
  /** Explica o motivo do desconto — visível tanto para a equipe quanto para o cliente. */
  motivo?: string;
}

/** Registro de que um administrador deu baixa manual num pagamento (dinheiro ou outro meio fora
 * do fluxo digital de comprovante) — sem isso, a parcela só vira "pago" pelo fluxo normal
 * (cliente envia comprovante, administrador confirma). */
export interface BaixaManualParcela {
  valor: number;
  aplicadoPorNome: string;
  aplicadoEm: string;
  motivo: string;
}

export interface Parcela {
  id: string;
  contratoId: string;
  numero: number;
  competencia: string;
  valorOriginal: number;
  /** Soma dos pagamentos parciais já CONFIRMADOS pelo administrador — o locatário pode pagar aos
   * poucos ao longo da semana (ver `PagamentoParcial`); multa/juros incidem só sobre o saldo
   * restante (valorOriginal - valorPago), não sobre o valor original inteiro. */
  valorPago: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusParcela;
  formaPagamento?: "pix" | "boleto" | "dinheiro" | "outro";
  /** Momento em que o cliente enviou o comprovante, aguardando confirmação do administrador. */
  dataEnvioComprovante?: string;
  desconto?: DescontoParcela;
  /** Preenchido quando esta parcela foi renegociada e absorvida por um acordo — ela sai do
   * Financeiro normal e passa a ser paga pelo cronograma do acordo. */
  acordoId?: string;
  baixaManual?: BaixaManualParcela;
}

export interface ValorAtualizadoParcela {
  diasAtraso: number;
  juros: number;
  multa: number;
  correcao: number;
  /** Quanto ainda falta pagar agora (saldo restante + encargos), não o valor original. */
  valorFinal: number;
}

export type StatusPagamentoParcial = "aguardando_confirmacao" | "confirmado" | "recusado";

/** Um envio de pagamento parcial pelo cliente — várias podem existir pra mesma parcela ao mesmo
 * tempo (ex: pagou uma parte na segunda, outra na quarta), cada uma revisada e confirmada
 * separadamente pelo administrador. Só quando confirmado, o valor entra em `Parcela.valorPago`. */
export interface PagamentoParcial {
  id: string;
  parcelaId: string;
  valor: number;
  formaPagamento?: "pix" | "boleto" | "dinheiro" | "outro";
  status: StatusPagamentoParcial;
  enviadoEm: string;
  confirmadoEm?: string;
}
