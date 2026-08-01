import type { Parcela, ParametrosFinanceiros, ValorAtualizadoParcela } from "@/lib/types";
import { daysBetween } from "@/lib/utils/formatters";
import { EMPRESA } from "@/lib/constants/empresa";

export function calcularValorAtualizado(
  parcela: Pick<
    Parcela,
    "valorOriginal" | "dataVencimento" | "status" | "dataEnvioComprovante" | "desconto"
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
    // Multa e correção incidem sobre o valor da locação; juros de mora são valor fixo por dia
    // de atraso (cláusula contratual), não um percentual sobre a parcela.
    multa = parcela.valorOriginal * (parametros.percentualMulta / 100);
    juros = parametros.jurosMoraDiarioReais * diasAtraso;
    const mesesAtraso = diasAtraso / 30;
    correcao = parcela.valorOriginal * (parametros.indiceCorrecaoMensal / 100) * mesesAtraso;
  }

  const desconto = parcela.desconto;
  if (desconto?.descontarMulta) multa = 0;

  let valorFinal = parcela.valorOriginal + multa + juros + correcao;
  if (desconto?.percentual) valorFinal *= 1 - desconto.percentual / 100;
  if (desconto?.valorFixo) valorFinal -= desconto.valorFixo;
  valorFinal = Math.max(0, valorFinal);

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
};
