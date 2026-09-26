export type StatusContrato = "em_dia" | "vence_em_breve" | "atraso" | "encerrado";

/** Prefixo do erro que `excluirContrato` lança quando há um acordo vinculado sem nenhum
 * pagamento nele — a tela de exclusão reconhece esse prefixo pra pedir uma segunda confirmação em
 * vez de só recusar a ação (diferente de parcela/multa paga, que é recusa definitiva). */
export const AVISO_ACORDO_SEM_ATIVIDADE = "ACORDO_SEM_ATIVIDADE";

export interface AditivoContrato {
  id: string;
  tipo: "aditivo" | "renovacao";
  descricao: string;
  data: string;
  arquivoUrl: string;
}

/** Status da solicitação de assinatura eletrônica na ClickSign — string livre porque reflete
 * exatamente o que a API deles envia (ex.: "draft", "running", "closed", "canceled"). Usado tanto
 * por contrato quanto por acordo — `requestId`/`signingKey` são campos legados da antiga
 * integração AssinaDoc, sem equivalente na ClickSign (só existem em contratos antigos). */
export interface AssinaturaContrato {
  status: string;
  requestId?: number;
  documentKey: string;
  signingKey?: string;
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
  /** Observação livre do administrador na criação do contrato — aparece também no PDF gerado. */
  observacao?: string;
  /** Ausente se o envio para assinatura ainda não foi feito ou falhou (não bloqueia o contrato). */
  assinatura?: AssinaturaContrato;
}
