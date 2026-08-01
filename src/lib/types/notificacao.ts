export type TipoNotificacao =
  | "parcela_vence_amanha"
  | "pagamento_confirmado"
  | "pagamento_recusado"
  | "nova_multa"
  | "multa_ciencia_confirmada"
  | "desconto_parcela_aplicado"
  | "cobranca_manual"
  | "acordo_criado"
  | "contrato_vencendo"
  | "revisao_agendada"
  | "documento_disponivel"
  | "chat_respondido";

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
  link?: string;
}
