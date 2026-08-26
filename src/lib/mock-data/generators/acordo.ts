import { faker } from "@faker-js/faker/locale/pt_BR";
import { addMonths } from "date-fns";
import type { Acordo, ParcelaAcordo } from "@/lib/types";

export function gerarAcordo(clienteId: string, contratoId: string, valorParcela: number): Acordo {
  const totalParcelas = faker.number.int({ min: 3, max: 6 });
  const valorEntrada = valorParcela * 1.5;
  const valorTotal = valorEntrada + valorParcela * totalParcelas;
  const inicio = faker.date.recent({ days: 60 });
  const acordoId = faker.string.uuid();

  const cronograma: ParcelaAcordo[] = Array.from({ length: totalParcelas }, (_, i) => {
    const vencimento = addMonths(inicio, i + 1);
    const pago = vencimento < new Date();
    return {
      id: faker.string.uuid(),
      acordoId,
      numero: i + 1,
      valor: valorParcela,
      vencimento: vencimento.toISOString(),
      status: pago ? "pago" : "em_aberto",
    };
  });

  return {
    id: acordoId,
    numero: `AC-${faker.string.numeric(6)}`,
    clienteId,
    contratoId,
    valorTotal,
    valorEntrada,
    periodicidade: "mensal",
    situacao: cronograma.every((p) => p.status === "pago") ? "quitado" : "ativo",
    cronograma,
    criadoEm: inicio.toISOString(),
  };
}
