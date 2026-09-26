import type { Multa } from "@/lib/types";

/** Saldo atual da multa — valor original, menos o que já foi pago (confirmado), com o desconto
 * administrativo (se houver) aplicado por cima do que sobrar. Mesmo esquema de
 * `calcularSaldoAcordo`: a multa é um valor fixo, sem juros/correção acumulando por atraso. */
export function calcularValorAtualizadoMulta(
  multa: Pick<Multa, "valor"> & {
    valorPago?: number;
    desconto?: Pick<NonNullable<Multa["desconto"]>, "percentual" | "valorFixo">;
  }
): number {
  let valor = multa.valor - (multa.valorPago ?? 0);
  const desconto = multa.desconto;
  if (desconto?.percentual) valor *= 1 - desconto.percentual / 100;
  if (desconto?.valorFixo) valor -= desconto.valorFixo;
  return Math.max(0, Math.round(valor * 100) / 100);
}
