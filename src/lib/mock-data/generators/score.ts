import { faker } from "@faker-js/faker/locale/pt_BR";
import { categoriaPorPontuacao } from "@/lib/calculations/score";
import type { HistoricoScore, ScoreLocatario } from "@/lib/types";

export function gerarScore(clienteId: string): ScoreLocatario {
  const pontuacao = faker.number.int({ min: 280, max: 980 });

  const historico: HistoricoScore[] = Array.from({ length: 6 }, (_, i) => ({
    data: faker.date.recent({ days: (6 - i) * 30 }).toISOString(),
    pontuacao: Math.max(0, pontuacao - faker.number.int({ min: -40, max: 120 })),
  })).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  historico[historico.length - 1] = { data: new Date().toISOString(), pontuacao };

  return {
    id: faker.string.uuid(),
    clienteId,
    pontuacao,
    categoria: categoriaPorPontuacao(pontuacao),
    pontualidadePagamentos: faker.number.int({ min: 60, max: 100 }),
    quantidadeAtrasos: faker.number.int({ min: 0, max: 8 }),
    tempoComoClienteMeses: faker.number.int({ min: 3, max: 60 }),
    conservacaoVeiculo: faker.number.int({ min: 60, max: 100 }),
    quantidadeContratos: faker.number.int({ min: 1, max: 4 }),
    quantidadeOcorrencias: faker.number.int({ min: 0, max: 5 }),
    historico,
  };
}
