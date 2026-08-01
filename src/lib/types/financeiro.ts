export type TipoMovimentoExtrato = "entrada" | "saida";

export interface MovimentoExtrato {
  id: string;
  contratoId: string;
  descricao: string;
  data: string;
  tipo: TipoMovimentoExtrato;
  valor: number;
  saldo: number;
}

export interface ParametrosFinanceiros {
  /** Multa por inadimplemento, em % sobre o valor da locação. */
  percentualMulta: number;
  /** Juros de mora, valor fixo em R$ por dia de atraso (cláusula contratual — não é percentual). */
  jurosMoraDiarioReais: number;
  /** Correção monetária mensal com base no IPCA, em %. */
  indiceCorrecaoMensal: number;
}

export type CanalCobranca = "email" | "sms" | "whatsapp" | "push";

export interface RegraCobranca {
  id: string;
  offsetDias: number; // negativo = antes do vencimento, positivo = depois
  canais: CanalCobranca[];
  mensagem: string;
  ativa: boolean;
}

/** Para quem a notificação avulsa de cobrança é enviada. */
export type DestinatarioCobranca = "cliente_especifico" | "todos_em_atraso";

/** Notificação de cobrança criada manualmente pelo administrador (avulsa, fora das regras
 * automáticas por dia de vencimento). */
export interface NotificacaoCobranca {
  id: string;
  titulo: string;
  descricao: string;
  canais: CanalCobranca[];
  destinatario: DestinatarioCobranca;
  /** Preenchido só quando `destinatario` é "cliente_especifico". */
  clienteId?: string;
  clienteNome?: string;
  /** Quantos clientes efetivamente receberam a notificação. */
  clientesAlcancados: number;
  enviadoPorNome: string;
  enviadoEm: string;
}
