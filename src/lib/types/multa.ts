export type StatusMulta = "pendente" | "paga" | "vencida" | "recorrida";

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
}
