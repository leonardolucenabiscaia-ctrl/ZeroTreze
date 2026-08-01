import { faker } from "@faker-js/faker/locale/pt_BR";
import { addMonths, isBefore, addDays } from "date-fns";
import type { AditivoContrato, Contrato, StatusContrato } from "@/lib/types";

/** Prazo mínimo de todo contrato da Zero Treze: 6 meses corridos a partir do início (cláusula
 * 2.1). Depois disso, se o contrato continuar ativo, ele entra em renovação automática semanal —
 * não tem mais uma data de fim fixa. */
export const PRAZO_MINIMO_MESES = 6;

/** Formata o número do contrato no padrão CT-{ano}-{sequencial de 3 dígitos}, ex.: CT-2026-001. */
export function formatarNumeroContrato(ano: number, sequencial: number): string {
  return `CT-${ano}-${String(sequencial).padStart(3, "0")}`;
}

export function gerarContrato(
  clienteId: string,
  veiculoId: string,
  numero: string,
  dataInicio: Date,
  valorParcela: number
): Contrato {
  const hoje = new Date();
  const fimPrazoMinimo = addMonths(dataInicio, PRAZO_MINIMO_MESES);

  // Uma pequena parte dos contratos já foi encerrada em algum momento — durante o prazo mínimo
  // ou já na fase de renovação automática — só para termos exemplos de contrato encerrado.
  const foiEncerrado =
    isBefore(dataInicio, hoje) && faker.datatype.boolean({ probability: 0.15 });

  let status: StatusContrato;
  let dataFim: Date;

  if (foiEncerrado) {
    status = "encerrado";
    dataFim = faker.date.between({ from: dataInicio, to: hoje });
  } else {
    // Ativo: a data de fim é sempre o fim do prazo mínimo, esteja ele no futuro (contrato ainda
    // dentro dos 6 meses iniciais) ou no passado (contrato já em renovação automática semanal).
    dataFim = fimPrazoMinimo;
    const diasParaFimPrazoMinimo = Math.round(
      (fimPrazoMinimo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    status =
      diasParaFimPrazoMinimo > 0 && diasParaFimPrazoMinimo <= 45 ? "vence_em_breve" : "em_dia";
  }

  const aditivos: AditivoContrato[] = faker.datatype.boolean({ probability: 0.3 })
    ? [
        {
          id: faker.string.uuid(),
          tipo: "aditivo",
          descricao: "Aditivo de alteração de franquia de quilometragem",
          data: addDays(dataInicio, 90).toISOString(),
          arquivoUrl: "/mock/documentos/aditivo.pdf",
        },
      ]
    : [];

  return {
    id: faker.string.uuid(),
    numero,
    clienteId,
    veiculoId,
    status,
    dataInicio: dataInicio.toISOString(),
    dataFim: dataFim.toISOString(),
    valorParcela,
    valorCaucao: valorParcela * 2,
    limiteRenovacao: valorParcela * 12,
    arquivoUrl: "/mock/documentos/contrato-principal.pdf",
    aditivos,
  };
}
