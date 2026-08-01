import { FAIXA_POR_CATEGORIA, type CategoriaScore } from "@/lib/types";

export function categoriaPorPontuacao(pontuacao: number): CategoriaScore {
  const entrada = (Object.entries(FAIXA_POR_CATEGORIA) as [CategoriaScore, [number, number]][]).find(
    ([, [min, max]]) => pontuacao >= min && pontuacao <= max
  );
  return entrada?.[0] ?? "bronze";
}

export function progressoNaFaixa(pontuacao: number): number {
  const categoria = categoriaPorPontuacao(pontuacao);
  const [min, max] = FAIXA_POR_CATEGORIA[categoria];
  return Math.round(((pontuacao - min) / (max - min)) * 100);
}
