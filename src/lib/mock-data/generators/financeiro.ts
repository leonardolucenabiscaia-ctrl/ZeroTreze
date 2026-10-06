import { faker } from "@faker-js/faker/locale/pt_BR";
import { addDays, addWeeks } from "date-fns";
import { parseData } from "@/lib/utils/formatters";
import type { Contrato, MovimentoExtrato, Parcela, StatusParcela } from "@/lib/types";

/** Retorna a segunda-feira da mesma semana de `data` (ou a própria data, se já for segunda). */
export function segundaFeiraDaSemana(data: Date): Date {
  // `getUTCDay`/`setUTCDate`, não `.getDay()`/`.setDate()` (fuso LOCAL do processo): `data` chega
  // aqui vinda de `parseData`, ancorada em meia-noite de Brasília (-03:00) — ou seja, a data UTC
  // correspondente (00:00-03:00 = 03:00 UTC do MESMO dia) já bate com o dia calendário de Brasília.
  // Usar os getters/setters locais faria essa conta variar dependendo do fuso onde o processo roda
  // (foi exatamente isso que causou todo contrato cair numa terça em vez de segunda) — com UTC, o
  // resultado é o mesmo não importa se o servidor roda em UTC, em -03:00 ou em qualquer outro fuso.
  const d = new Date(data);
  const dia = d.getUTCDay(); // 0 = domingo ... 6 = sábado, segunda = 1
  const diff = (1 - dia + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/**
 * Instante em que o prazo de pagamento acaba: 23h59min59s de Brasília do dia de `data` — usado só
 * para decidir internamente se uma parcela já venceu (`instante < hoje`), nunca para gravar no
 * banco. 23:59:59 em Brasília (-03:00) cai às 02:59:59 do dia SEGUINTE em UTC — se esse instante
 * fosse gravado direto numa coluna `date` (que descarta hora/fuso), o Postgres trunca pra sua data
 * em UTC, e o dia gravado sairia um dia inteiro depois da segunda-feira pretendida. É exatamente
 * esse o mecanismo que fez os contratos gerados pelo script de seed (rodado numa máquina no fuso de
 * Brasília) caírem numa terça em vez de segunda: a data armazenada vinha deste instante, não da
 * meia-noite UTC pura que `segundaFeiraDaSemana` calcula. Por isso `gerarParcelas` grava sempre a
 * data-calendário pura (meia-noite UTC) e usa esta função apenas para a comparação de status.
 */
function instanteFimDoPrazo(data: Date): Date {
  const d = new Date(data);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(2, 59, 59, 999);
  return d;
}

/** Data-calendário pura ("AAAA-MM-DD"), sem hora nem fuso — formato seguro pra colunas `date`. */
function paraDataPura(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Rótulo da competência semanal (ex.: "Semana de 05/01 a 11/01/2026"). */
export function competenciaDaSemana(vencimento: Date): string {
  // `toLocaleDateString`/`format` do date-fns leem os campos de data no fuso LOCAL do processo —
  // arriscado pro mesmo motivo do resto deste arquivo (o rótulo sairia com o dia errado se isso
  // rodasse num fuso diferente de UTC). Montamos a string à mão a partir de `paraDataPura`
  // (UTC puro) pra não depender do fuso de quem está rodando.
  const inicioSemana = paraDataPura(addDays(vencimento, -6));
  const fimSemana = paraDataPura(vencimento);
  const [anoFim, mesFim, diaFim] = fimSemana.split("-");
  const [, mesInicio, diaInicio] = inicioSemana.split("-");
  return `Semana de ${diaInicio}/${mesInicio} a ${diaFim}/${mesFim}/${anoFim}`;
}

/**
 * Gera de uma vez todas as parcelas semanais do prazo mínimo inicial do contrato (os 6 meses
 * definidos em `contrato.dataFim` na criação) — semanas já vencidas ficam pagas ou vencidas ao
 * acaso, e as semanas ainda não vencidas ficam "em_aberto" desde já. Depois que esses 6 meses
 * iniciais se esgotam, se o contrato continuar ativo, entra em renovação automática semanal —
 * aí sim, uma parcela por vez, liberada só quando a anterior vence (via `financeiro.service`).
 */
export function gerarParcelas(contrato: Contrato): Parcela[] {
  // `parseData`, não `new Date()` direto: quando `contrato.dataInicio`/`dataFim` chegam como data
  // pura ("AAAA-MM-DD", sem hora — caso de `criarContrato`), `new Date("AAAA-MM-DD")` interpreta
  // isso como meia-noite EM UTC, e sem o anchor de `parseData` em `-03:00` a conta de "qual
  // segunda-feira" ficaria exposta ao fuso de quem está lendo. Quando já vêm com hora/instante
  // (caso do script de seed, que usa `faker.date.past()`), `parseData` não altera nada.
  const inicio = parseData(contrato.dataInicio);
  const fim = parseData(contrato.dataFim);
  const hoje = new Date();

  const parcelas: Parcela[] = [];
  // `vencimento` é sempre meia-noite UTC do dia-calendário certo (nunca 23h59 Brasília) — é esse
  // valor, não um instante deslocado, que vai pra `dataVencimento`/coluna `date`. `instanteFimDoPrazo`
  // só entra na comparação `< hoje` abaixo, pra decidir status, nunca no que é gravado.
  let vencimento = segundaFeiraDaSemana(inicio);
  let numero = 1;

  while (vencimento.getTime() <= fim.getTime()) {
    const dataVencimento = paraDataPura(vencimento);

    if (instanteFimDoPrazo(vencimento) < hoje) {
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
        valorPago: foiPaga ? contrato.valorParcela : 0,
        dataVencimento,
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
        valorPago: 0,
        dataVencimento,
        status: "em_aberto",
      });
    }

    numero++;
    vencimento = addWeeks(vencimento, 1);
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
