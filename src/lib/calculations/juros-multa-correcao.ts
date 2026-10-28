import type { Parcela, ParametrosFinanceiros, ValorAtualizadoParcela } from "@/lib/types";
import { daysBetween } from "@/lib/utils/formatters";
import { EMPRESA } from "@/lib/constants/empresa";

export function calcularValorAtualizado(
  parcela: Pick<
    Parcela,
    "valorOriginal" | "valorPago" | "dataVencimento" | "status" | "dataEnvioComprovante" | "desconto"
  >,
  parametros: ParametrosFinanceiros,
  referencia: Date = new Date()
): ValorAtualizadoParcela {
  // Enquanto aguarda confirmação do administrador, os encargos ficam congelados na data
  // do envio do comprovante — o cliente não pode ser penalizado pelo tempo de análise.
  const referenciaEfetiva =
    parcela.status === "aguardando_confirmacao" && parcela.dataEnvioComprovante
      ? new Date(parcela.dataEnvioComprovante)
      : referencia;

  const diasAtraso =
    parcela.status === "pago"
      ? 0
      : Math.max(0, daysBetween(parcela.dataVencimento, referenciaEfetiva));

  let multa = 0;
  let juros = 0;
  let correcao = 0;

  if (diasAtraso > 0) {
    // Multa e correção incidem sobre o valor ORIGINAL da parcela (fixo) — nunca sobre o que
    // ainda falta pagar. Calcular em cima do saldo restante tinha um furo grave: se o locatário
    // pagasse só o valor original (sem a multa), o saldo restante do principal ia a zero e a
    // multa recalculava como "X% de zero" — ou seja, desaparecia, mesmo com a multa ainda devida.
    // Juros de mora já eram um valor fixo por dia (cláusula contratual), imune a esse problema.
    multa = parcela.valorOriginal * (parametros.percentualMulta / 100);
    juros = parametros.jurosMoraDiarioReais * diasAtraso;
    const mesesAtraso = diasAtraso / 30;
    correcao = parcela.valorOriginal * (parametros.indiceCorrecaoMensal / 100) * mesesAtraso;
  }

  const desconto = parcela.desconto;
  if (desconto?.descontarMulta) multa = 0;

  // Valor total devido se nada tivesse sido pago ainda — o que já foi pago abate desse total
  // COMBINADO (principal + multa + juros + correção), não só do principal, pra um pagamento que
  // cobre exatamente o valor original não deixar a multa "esquecida".
  let valorTotalDevido = parcela.valorOriginal + multa + juros + correcao;
  if (desconto?.percentual) valorTotalDevido *= 1 - desconto.percentual / 100;
  if (desconto?.valorFixo) valorTotalDevido -= desconto.valorFixo;

  const valorFinal = Math.max(0, valorTotalDevido - (parcela.valorPago ?? 0));

  return {
    diasAtraso,
    juros: arredondar(juros),
    multa: arredondar(multa),
    correcao: arredondar(correcao),
    valorFinal: arredondar(valorFinal),
  };
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Espelha a cláusula de inadimplemento do contrato-base (ver EMPRESA e a tela de impressão). */
export const PARAMETROS_FINANCEIROS_PADRAO: ParametrosFinanceiros = {
  percentualMulta: EMPRESA.multaAtrasoPercentual,
  jurosMoraDiarioReais: EMPRESA.jurosMoraDiario,
  indiceCorrecaoMensal: 0.5,
  percentualMultaAcordo: 0,
};
