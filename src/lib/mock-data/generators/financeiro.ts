import { faker } from "@faker-js/faker/locale/pt_BR";
import { addDays, addWeeks, format } from "date-fns";
import type { Contrato, MovimentoExtrato, Parcela, StatusParcela } from "@/lib/types";

/** Retorna a segunda-feira da mesma semana de `data` (ou a própria data, se já for segunda). */
export function segundaFeiraDaSemana(data: Date): Date {
  const d = new Date(data);
  const dia = d.getDay(); // 0 = domingo ... 6 = sábado, segunda = 1
  const diff = (1 - dia + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Fixa o horário no limite de pagamento: segunda-feira às 23h59min59s. */
export function comPrazoAte2359(data: Date): Date {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Rótulo da competência semanal (ex.: "Semana de 05/01 a 11/01/2026"). */
export function competenciaDaSemana(vencimento: Date): string {
  const inicioSemana = addDays(vencimento, -6);
  return `Semana de ${format(inicioSemana, "dd/MM")} a ${format(vencimento, "dd/MM/yyyy")}`;
}

/**
 * Gera de uma vez todas as parcelas semanais do prazo mínimo inicial do contrato (os 6 meses
 * definidos em `contrato.dataFim` na criação) — semanas já vencidas ficam pagas ou vencidas ao
 * acaso, e as semanas ainda não vencidas ficam "em_aberto" desde já. Depois que esses 6 meses
 * iniciais se esgotam, se o contrato continuar ativo, entra em renovação automática semanal —
 * aí sim, uma parcela por vez, liberada só quando a anterior vence (via `financeiro.service`).
 */
export function gerarParcelas(contrato: Contrato): Parcela[] {
  const inicio = new Date(contrato.dataInicio);
  const fim = new Date(contrato.dataFim);
  const hoje = new Date();

  const parcelas: Parcela[] = [];
  let vencimento = comPrazoAte2359(segundaFeiraDaSemana(inicio));
  let numero = 1;

  while (vencimento.getTime() <= fim.getTime()) {
    if (vencimento < hoje) {
      const foiPaga = faker.datatype.boolean({ probability: 0.85 });
      const status: StatusParcela = foiPaga ? "pago" : "vencido";
      const dataPagamento = foiPaga
        ? faker.date.between({ from: addDays(vencimento, -6), to: vencimento }).toISOString()
        : undefined;

      parcelas.push({
        id: faker.string.uuid(),
        contratoId: contrato.id,
        numero,
        competencia: competenciaDaSemana(vencimento),
        valorOriginal: contrato.valorParcela,
        dataVencimento: vencimento.toISOString(),
        dataPagamento,
        status,
        formaPagamento: foiPaga ? faker.helpers.arrayElement(["pix", "boleto"]) : undefined,
      });
    } else {
      // Dentro dos 6 meses iniciais, mas ainda não venceu: fica em aberto desde a criação.
      parcelas.push({
        id: faker.string.uuid(),
        contratoId: contrato.id,
        numero,
        competencia: competenciaDaSemana(vencimento),
        valorOriginal: contrato.valorParcela,
        dataVencimento: vencimento.toISOString(),
        status: "em_aberto",
      });
    }

    numero++;
    vencimento = comPrazoAte2359(addWeeks(vencimento, 1));
  }

  return parcelas;
}

export function gerarExtrato(contrato: Contrato, parcelas: Parcela[]): MovimentoExtrato[] {
  let saldo = 0;
  const movimentos: MovimentoExtrato[] = [];

  movimentos.push({
    id: faker.string.uuid(),
    contratoId: contrato.id,
    descricao: `Caução recebida — contrato ${contrato.numero}`,
    data: contrato.dataInicio,
    tipo: "entrada",
    valor: contrato.valorCaucao,
    saldo: (saldo += contrato.valorCaucao),
  });

  const pagas = parcelas
    .filter((p) => p.status === "pago" && p.dataPagamento)
    .sort((a, b) => new Date(a.dataPagamento!).getTime() - new Date(b.dataPagamento!).getTime());

  for (const parcela of pagas) {
    movimentos.push({
      id: faker.string.uuid(),
      contratoId: contrato.id,
      descricao: `Pagamento parcela ${parcela.numero} — ${parcela.competencia}`,
      data: parcela.dataPagamento!,
      tipo: "entrada",
      valor: parcela.valorOriginal,
      saldo: (saldo += parcela.valorOriginal),
    });
  }

  return movimentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}
