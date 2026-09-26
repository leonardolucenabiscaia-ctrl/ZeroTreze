import type { BaixaManualParcela, StatusPagamentoParcial } from "./parcela";
import type { AssinaturaContrato } from "./contrato";

export type StatusAcordo = "ativo" | "quitado" | "rompido" | "encerrado";
export type PeriodicidadeAcordo = "semanal" | "mensal";
export type StatusParcelaAcordo = "pago" | "em_aberto" | "vencido" | "aguardando_confirmacao";

/** Desconto concedido pelo administrador sobre uma parcela de acordo — sem "descontar multa"
 * (diferente da parcela de contrato), porque a parcela do acordo já é um valor fixo negociado,
 * sem juros/multa/correção acumulando. */
export interface DescontoParcelaAcordo {
  /** Percentual de desconto (0-100) sobre o valor da parcela. */
  percentual?: number;
  /** Valor fixo, em reais, abatido do valor da parcela. */
  valorFixo?: number;
  aplicadoPorNome: string;
  aplicadoEm: string;
  motivo?: string;
}

export interface ParcelaAcordo {
  id: string;
  acordoId: string;
  numero: number;
  valor: number;
  /** Soma dos pagamentos parciais já CONFIRMADOS pelo administrador — mesmo esquema das parcelas
   * de contrato: o locatário pode ir completando aos poucos ao longo da semana. */
  valorPago: number;
  vencimento: string;
  status: StatusParcelaAcordo;
  formaPagamento?: "pix" | "boleto" | "dinheiro" | "outro";
  dataEnvioComprovante?: string;
  dataPagamento?: string;
  desconto?: DescontoParcelaAcordo;
  baixaManual?: BaixaManualParcela;
}

/** Um envio de pagamento parcial pelo cliente pra uma parcela de acordo — mesmo esquema de
 * `PagamentoParcial` das parcelas de contrato. */
export interface PagamentoParcialAcordo {
  id: string;
  parcelaAcordoId: string;
  valor: number;
  formaPagamento?: "pix" | "boleto" | "dinheiro" | "outro";
  status: StatusPagamentoParcial;
  enviadoEm: string;
  confirmadoEm?: string;
}

export interface Acordo {
  id: string;
  numero: string;
  clienteId: string;
  contratoId: string;
  valorTotal: number;
  valorEntrada: number;
  /** Valor cheio da dívida original antes da renegociação — opcional, informativo. */
  valorDividaOriginal?: number;
  periodicidade: PeriodicidadeAcordo;
  situacao: StatusAcordo;
  cronograma: ParcelaAcordo[];
  descricao?: string;
  /** Data em que o acordo passa a valer de fato — pode ser posterior à criação, quando o acordo
   * demora pra entrar em vigor. Independente do vencimento da 1ª parcela do cronograma. */
  dataInicio: string;
  criadoEm: string;
  /** Ausente se o envio para assinatura ainda não foi feito ou falhou (não bloqueia o acordo). */
  assinatura?: AssinaturaContrato;
  /** URL do PDF assinado — só existe depois que a ClickSign confirma que todo mundo assinou. */
  arquivoUrl?: string;
}
