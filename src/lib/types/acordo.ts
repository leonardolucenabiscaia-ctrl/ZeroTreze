export type StatusAcordo = "ativo" | "quitado" | "rompido";
export type PeriodicidadeAcordo = "semanal" | "mensal";
export type StatusParcelaAcordo = "pago" | "em_aberto" | "vencido" | "aguardando_confirmacao";

export interface ParcelaAcordo {
  id: string;
  acordoId: string;
  numero: number;
  valor: number;
  vencimento: string;
  status: StatusParcelaAcordo;
  formaPagamento?: "pix" | "boleto";
  dataEnvioComprovante?: string;
  dataPagamento?: string;
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
