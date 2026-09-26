export type StatusMulta = "pendente" | "paga" | "vencida" | "recorrida";
export type StatusPagamentoParcialMulta = "aguardando_confirmacao" | "confirmado" | "recusado";

/** Um envio de pagamento parcial pelo cliente pra uma multa — mesmo esquema de `PagamentoParcial`
 * das parcelas de contrato/acordo: fica "aguardando_confirmacao" até o administrador conferir o
 * recebimento na conta bancária. */
export interface PagamentoParcialMulta {
  id: string;
  multaId: string;
  valor: number;
  formaPagamento?: "pix" | "boleto" | "dinheiro" | "outro";
  status: StatusPagamentoParcialMulta;
  enviadoEm: string;
  confirmadoEm?: string;
}

/** Mesmo esquema de desconto administrativo já usado nas parcelas de acordo — a multa é um valor
 * fixo, sem juros/correção acumulando. */
export interface DescontoMulta {
  percentual?: number;
  valorFixo?: number;
  aplicadoPorNome: string;
  aplicadoEm: string;
  motivo?: string;
}

export interface BaixaManualMulta {
  valor: number;
  aplicadoPorNome: string;
  aplicadoEm: string;
  motivo: string;
}

export interface Multa {
  id: string;
  contratoId: string;
  numeroAuto: string;
  orgao: string;
  /** Data em que a infração ocorreu. */
  data: string;
  descricao: string;
  valor: number;
  vencimento: string;
  situacao: StatusMulta;
  /** Soma dos pagamentos parciais já CONFIRMADOS pelo administrador — o locatário pode ir
   * completando aos poucos (mesmo esquema das parcelas de contrato/acordo). */
  valorPago: number;
  /** Quantidade de pontos que a multa gera na CNH. */
  pontos: number;
  /** Data em que a multa foi cadastrada na plataforma (pode ser retroativa ao lançamento manual). */
  dataRegistro: string;
  anexoUrl?: string;
  /**
   * Data/hora em que o locatário confirmou ciência da multa. Enquanto estiver ausente, o portal
   * do cliente fica bloqueado (só a tela de ciência da multa é acessível) — ver `MultaCienciaGate`.
   */
  cienciaEm?: string;
  formaPagamento?: "pix" | "boleto" | "dinheiro" | "outro";
  desconto?: DescontoMulta;
  baixaManual?: BaixaManualMulta;
}
