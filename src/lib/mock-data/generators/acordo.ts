import { faker } from "@faker-js/faker/locale/pt_BR";
import { addMonths } from "date-fns";
import type { Acordo, ParcelaAcordo } from "@/lib/types";

export function gerarAcordo(clienteId: string, contratoId: string, valorParcela: number): Acordo {
  const totalParcelas = faker.number.int({ min: 3, max: 6 });
  const valorEntrada = valorParcela * 1.5;
  const valorTotal = valorEntrada + valorParcela * totalParcelas;
  const inicio = faker.date.recent({ days: 60 });

  const cronograma: ParcelaAcordo[] = Array.from({ length: totalParcelas }, (_, i) => ({
    numero: i + 1,
    valor: valorParcela,
    vencimento: addMonths(inicio, i + 1).toISOString(),
    pago: addMonths(inicio, i + 1) < new Date(),
  }));

  return {
    id: faker.string.uuid(),
    numero: `AC-${faker.string.numeric(6)}`,
    clienteId,
    contratoId,
    valorTotal,
    valorEntrada,
    situacao: cronograma.every((p) => p.pago) ? "quitado" : "ativo",
    cronograma,
    criadoEm: inicio.toISOString(),
  };
}
