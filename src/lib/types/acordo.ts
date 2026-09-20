import type { BaixaManualParcela } from "./parcela";

export type StatusAcordo = "ativo" | "quitado" | "rompido";
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
  vencimento: string;
  status: StatusParcelaAcordo;
  formaPagamento?: "pix" | "boleto" | "dinheiro" | "outro";
  dataEnvioComprovante?: string;
  dataPagamento?: string;
  desconto?: DescontoParcelaAcordo;
  baixaManual?: BaixaManualParcela;
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
  criadoEm: string;
}
