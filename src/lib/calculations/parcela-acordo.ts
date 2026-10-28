import type { ParametrosFinanceiros, ParcelaAcordo } from "@/lib/types";
import { daysBetween } from "@/lib/utils/formatters";

/** Quanto ainda falta pagar dessa parcela de acordo agora — o valor negociado MAIS a multa por
 * atraso (se vencida — `percentualMultaAcordo`, configurável em Configurações, separada da multa
 * de contrato normal), com o desconto administrativo (se houver) aplicado por cima do total, menos
 * o que já foi confirmado (`valorPago`). Diferente da parcela de contrato, não tem juros de mora
 * nem correção monetária acumulando — só essa multa. */
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

  // Multa incide sobre o valor ORIGINAL da parcela (fixo) — nunca sobre o que ainda falta pagar.
  // Calcular em cima do saldo restante tinha um furo grave: se o locatário pagasse só o valor
  // original (sem a multa), o saldo do principal ia a zero e a multa recalculava como "X% de
  // zero" — desaparecia, mesmo com a multa ainda devida. O que já foi pago agora abate do total
  // COMBINADO (valor + multa), não só do valor original, pra um pagamento que cobre exatamente o
  // valor da parcela não deixar a multa esquecida.
  const multa = diasAtraso > 0 ? parcela.valor * (parametros.percentualMultaAcordo / 100) : 0;

  let valorTotalDevido = parcela.valor + multa;
  const desconto = parcela.desconto;
  if (desconto?.percentual) valorTotalDevido *= 1 - desconto.percentual / 100;
  if (desconto?.valorFixo) valorTotalDevido -= desconto.valorFixo;

  const saldo = Math.max(0, valorTotalDevido - (parcela.valorPago ?? 0));
  return Math.round(saldo * 100) / 100;
}
