import type { ParcelaAcordo } from "@/lib/types";

/** Quanto ainda falta pagar dessa parcela de acordo agora — o valor negociado, menos o que já
 * foi confirmado (`valorPago`, pagamentos parciais), com o desconto administrativo (se houver)
 * aplicado por cima do que sobrar. A parcela do acordo é um valor fixo negociado: não tem
 * juros/multa/correção como as parcelas de contrato. */
export function calcularSaldoAcordo(
  parcela: Pick<ParcelaAcordo, "valor" | "valorPago"> & {
    desconto?: Pick<NonNullable<ParcelaAcordo["desconto"]>, "percentual" | "valorFixo">;
  }
): number {
  let saldo = parcela.valor - (parcela.valorPago ?? 0);
  const desconto = parcela.desconto;
  if (desconto?.percentual) saldo *= 1 - desconto.percentual / 100;
  if (desconto?.valorFixo) saldo -= desconto.valorFixo;
  return Math.max(0, Math.round(saldo * 100) / 100);
}
