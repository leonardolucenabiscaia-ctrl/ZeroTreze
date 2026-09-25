import type { Multa } from "@/lib/types";

/** Valor atual da multa considerando o desconto administrativo (se houver) — a multa é um valor
 * fixo, sem juros/correção acumulando por atraso (mesmo esquema já usado em
 * `calcularSaldoAcordo`). */
export function calcularValorAtualizadoMulta(
  multa: Pick<Multa, "valor"> & { desconto?: Pick<NonNullable<Multa["desconto"]>, "percentual" | "valorFixo"> }
): number {
  let valor = multa.valor;
  const desconto = multa.desconto;
  if (desconto?.percentual) valor *= 1 - desconto.percentual / 100;
  if (desconto?.valorFixo) valor -= desconto.valorFixo;
  return Math.max(0, Math.round(valor * 100) / 100);
}
