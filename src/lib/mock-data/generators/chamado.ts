import { faker } from "@faker-js/faker/locale/pt_BR";
import type { CategoriaChamado, Chamado, Mensagem, PrioridadeChamado, StatusChamado } from "@/lib/types";

const CATEGORIAS: CategoriaChamado[] = [
  "financeiro",
  "manutencao",
  "documentacao",
  "acidente",
  "troca_veiculo",
  "duvidas",
];

const TITULOS: Record<CategoriaChamado, string[]> = {
  financeiro: ["Dúvida sobre valor da parcela", "Solicitação de 2ª via de boleto"],
  manutencao: ["Agendamento de revisão", "Ruído estranho no motor"],
  documentacao: ["Solicitação de CRLV atualizado", "Cópia da apólice de seguro"],
  acidente: ["Registro de sinistro", "Solicitação de guincho pós-acidente"],
  troca_veiculo: ["Solicitação de troca de veículo", "Avaliação para upgrade de categoria"],
  duvidas: ["Dúvida sobre renovação de contrato", "Como funciona a caução?"],
};

export function gerarChamado(clienteId: string, clienteNome: string, contratoId: string): Chamado {
  const categoria = faker.helpers.arrayElement(CATEGORIAS);
  const status = faker.helpers.arrayElement<StatusChamado>([
    "aberto",
    "em_andamento",
    "aguardando_cliente",
    "resolvido",
    "encerrado",
  ]);
  const criadoEm = faker.date.recent({ days: 60 });

  const mensagens: Mensagem[] = [
    {
      id: faker.string.uuid(),
      chamadoId: "",
      autorId: clienteId,
      autorNome: clienteNome,
      autorPerfil: "cliente",
      texto: faker.lorem.sentence(12),
      enviadaEm: criadoEm.toISOString(),
      status: "lida",
    },
  ];

  if (status !== "aberto") {
    mensagens.push({
      id: faker.string.uuid(),
      chamadoId: "",
      autorId: "operador-mock",
      autorNome: "Central de Atendimento Zero Treze",
      autorPerfil: "operador",
      texto: faker.lorem.sentence(16),
      enviadaEm: faker.date.soon({ days: 2, refDate: criadoEm }).toISOString(),
      status: "entregue",
    });
  }

  const chamadoId = faker.string.uuid();
  mensagens.forEach((m) => (m.chamadoId = chamadoId));

  return {
    id: chamadoId,
    numero: `AT-${faker.string.numeric(6)}`,
    clienteId,
    contratoId,
    categoria,
    titulo: faker.helpers.arrayElement(TITULOS[categoria]),
    status,
    prioridade: faker.helpers.arrayElement<PrioridadeChamado>(["baixa", "media", "alta", "urgente"]),
    criadoEm: criadoEm.toISOString(),
    atualizadoEm: mensagens[mensagens.length - 1].enviadaEm,
    mensagens,
  };
}
