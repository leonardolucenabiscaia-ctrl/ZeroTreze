export type CategoriaScore = "bronze" | "prata" | "ouro" | "platina" | "diamante";

export interface HistoricoScore {
  data: string;
  pontuacao: number;
}

export interface ScoreLocatario {
  id: string;
  clienteId: string;
  pontuacao: number;
  categoria: CategoriaScore;
  pontualidadePagamentos: number;
  quantidadeAtrasos: number;
  tempoComoClienteMeses: number;
  conservacaoVeiculo: number;
  quantidadeContratos: number;
  quantidadeOcorrencias: number;
  historico: HistoricoScore[];
}

export const BENEFICIOS_POR_CATEGORIA: Record<CategoriaScore, string[]> = {
  bronze: ["Acesso ao portal do locatário"],
  prata: ["5% de desconto em renovação"],
  ouro: ["10% de desconto em renovação", "Redução de 10% na caução"],
  platina: [
    "15% de desconto em renovação",
    "Redução de 25% na caução",
    "Prioridade no atendimento",
  ],
  diamante: [
    "20% de desconto em renovação",
    "Isenção parcial de caução",
    "Prioridade máxima no atendimento",
    "Limite maior para novos contratos",
  ],
};

export const FAIXA_POR_CATEGORIA: Record<CategoriaScore, [number, number]> = {
  bronze: [0, 399],
  prata: [400, 599],
  ouro: [600, 749],
  platina: [750, 899],
  diamante: [900, 1000],
};
