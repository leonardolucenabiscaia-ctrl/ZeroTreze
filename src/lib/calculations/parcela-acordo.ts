import type { ParametrosFinanceiros, ParcelaAcordo } from "@/lib/types";
import { daysBetween } from "@/lib/utils/formatters";

/** Quanto ainda falta pagar dessa parcela de acordo agora — o valor negociado, menos o que já
 * foi confirmado (`valorPago`, pagamentos parciais), mais a multa por atraso (se vencida —
 * `percentualMultaAcordo`, configurável em Configurações, separada da multa de contrato normal),
 * com o desconto administrativo (se houver) aplicado por cima do que sobrar. Diferente da
 * parcela de contrato, não tem juros de mora nem correção monetária acumulando — só essa multa. */
export function calcularSaldoAcordo(
  parcela: Pick<ParcelaAcordo, "valor" | "valorPago" | "vencimento" | "status" | "dataEnvioComprovante"> & {
    desconto?: Pick<NonNullable<ParcelaAcordo["desconto"]>, "percentual" | "valorFixo">;
  },
  parametros: Pick<ParametrosFinanceiros, "percentualMultaAcordo">,
  referencia: Date = new Date()
): number {
  // Mesma regra da parcela de contrato: enquanto aguarda confirmação do administrador, a multa
  // fica congelada na data do envio do comprovante — o cliente não é penalizado pelo tempo de
  // análise.
  const referenciaEfetiva =
    parcela.status === "aguardando_confirmacao" && parcela.dataEnvioComprovante
      ? new Date(parcela.dataEnvioComprovante)
      : referencia;
  const diasAtraso = parcela.status === "pago" ? 0 : Math.max(0, daysBetween(parcela.vencimento, referenciaEfetiva));

  const saldoRestante = Math.max(0, parcela.valor - (parcela.valorPago ?? 0));
  const multa = diasAtraso > 0 ? saldoRestante * (parametros.percentualMultaAcordo / 100) : 0;

  let saldo = saldoRestante + multa;
  const desconto = parcela.desconto;
  if (desconto?.percentual) saldo *= 1 - desconto.percentual / 100;
  if (desconto?.valorFixo) saldo -= desconto.valorFixo;
  return Math.max(0, Math.round(saldo * 100) / 100);
}
