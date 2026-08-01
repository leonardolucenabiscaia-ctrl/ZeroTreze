import { faker } from "@faker-js/faker/locale/pt_BR";
import type { Notificacao, TipoNotificacao } from "@/lib/types";

const TEMPLATES: Record<TipoNotificacao, { titulo: string; mensagem: string }> = {
  parcela_vence_amanha: {
    titulo: "Parcela vence amanhã",
    mensagem: "Sua parcela vence amanhã. Evite juros e multa pagando em dia.",
  },
  pagamento_confirmado: {
    titulo: "Pagamento confirmado",
    mensagem: "Recebemos a confirmação do seu pagamento. Obrigado!",
  },
  pagamento_recusado: {
    titulo: "Pagamento não confirmado",
    mensagem: "Não conseguimos confirmar o recebimento do seu pagamento. Verifique e tente novamente.",
  },
  nova_multa: {
    titulo: "Nova multa registrada",
    mensagem: "Uma nova multa de trânsito foi registrada no seu contrato.",
  },
  acordo_criado: {
    titulo: "Novo acordo disponível",
    mensagem: "Um acordo de renegociação foi criado para o seu contrato. Confira as condições.",
  },
  contrato_vencendo: {
    titulo: "Contrato próximo do vencimento",
    mensagem: "Seu contrato está próximo do vencimento. Que tal renovar agora?",
  },
  revisao_agendada: {
    titulo: "Revisão agendada",
    mensagem: "A revisão do seu veículo foi agendada com sucesso.",
  },
  documento_disponivel: {
    titulo: "Documento disponível",
    mensagem: "Um novo documento está disponível para download.",
  },
  chat_respondido: {
    titulo: "Chat respondido",
    mensagem: "Você recebeu uma nova resposta no seu atendimento.",
  },
  multa_ciencia_confirmada: {
    titulo: "Cliente confirmou ciência de multa",
    mensagem: "O cliente confirmou estar ciente da multa registrada no contrato.",
  },
  desconto_parcela_aplicado: {
    titulo: "Desconto aplicado em uma parcela",
    mensagem: "Uma parcela do seu contrato recebeu um desconto. Confira o novo valor atualizado.",
  },
  cobranca_manual: {
    titulo: "Mensagem da Zero Treze",
    mensagem: "Você recebeu uma nova mensagem de cobrança. Confira os detalhes no financeiro.",
  },
};

// "multa_ciencia_confirmada" é dirigida ao administrador (ver `confirmarCienciaMulta`) e
// "cobranca_manual" tem título/mensagem sempre escritos pelo admin na hora do envio — nenhuma
// das duas faz sentido sortear para o feed aleatório de demonstração de um cliente.
const TIPOS_ALEATORIOS_CLIENTE = (Object.keys(TEMPLATES) as TipoNotificacao[]).filter(
  (tipo) => tipo !== "multa_ciencia_confirmada" && tipo !== "cobranca_manual"
);

export function gerarNotificacao(usuarioId: string, tipo?: TipoNotificacao): Notificacao {
  const tipoFinal = tipo ?? faker.helpers.arrayElement(TIPOS_ALEATORIOS_CLIENTE);
  const template = TEMPLATES[tipoFinal];

  return {
    id: faker.string.uuid(),
    usuarioId,
    tipo: tipoFinal,
    titulo: template.titulo,
    mensagem: template.mensagem,
    lida: faker.datatype.boolean({ probability: 0.4 }),
    criadoEm: faker.date.recent({ days: 30 }).toISOString(),
  };
}
