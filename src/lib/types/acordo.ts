export type StatusAcordo = "ativo" | "quitado" | "rompido";

export interface ParcelaAcordo {
  numero: number;
  valor: number;
  vencimento: string;
  pago: boolean;
}

export interface Acordo {
  id: string;
  numero: string;
  clienteId: string;
  contratoId: string;
  valorTotal: number;
  valorEntrada: number;
  situacao: StatusAcordo;
  cronograma: ParcelaAcordo[];
  descricao?: string;
  /** Data em que o acordo foi firmado — usada como data de assinatura no documento impresso. */
  criadoEm: string;
}
