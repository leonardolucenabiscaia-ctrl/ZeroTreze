import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const REGEX_DATA_SOMENTE = /^\d{4}-\d{2}-\d{2}$/;

/** Interpreta uma data no formato "YYYY-MM-DD" (sem hora — sempre vinda de uma coluna `date` do
 * banco: vencimento, validade da CNH, data de nascimento etc.) como meia-noite no fuso de
 * Brasília (UTC-3, fixo — o Brasil não usa mais horário de verão desde 2019), não importa em que
 * fuso o código está rodando (navegador do cliente ou o servidor da Vercel, que roda em UTC).
 *
 * Evita o bug clássico de `new Date("2026-01-22")`: o JS sempre interpreta strings sem hora como
 * meia-noite EM UTC — num fuso atrás de UTC (como o do Brasil) isso aparece/compara como um dia
 * antes do que foi digitado. Datas que já vêm com hora/fuso (timestamptz — `criadoEm`,
 * `dataEnvioComprovante` etc.) passam direto, sem alteração: representam um instante real, não só
 * uma data. */
export function parseData(date: Date | string): Date {
  if (typeof date === "string" && REGEX_DATA_SOMENTE.test(date)) {
    return new Date(`${date}T00:00:00-03:00`);
  }
  return typeof date === "string" ? new Date(date) : date;
}

export function formatDate(date: Date | string, pattern = "dd/MM/yyyy"): string {
  return format(parseData(date), pattern, { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
}

/** Converte uma data/timestamp pro formato ("YYYY-MM-DD") de um `<input type="date">`, sempre no
 * fuso de Brasília. Não usar `new Date(iso).toISOString().slice(0, 10)` pra isso:
 * `toISOString()` sempre usa UTC, então nas últimas horas do dia em Brasília (21h-23h59, quando em
 * UTC já é o dia seguinte) o campo apareceria preenchido com o dia seguinte ao real. */
export function formatDateInput(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(parseData(date));
}

/** Data de hoje ("YYYY-MM-DD") no fuso de Brasília — pra preencher o valor padrão de campos
 * `<input type="date">` (ex.: "data de entrada na plataforma"). */
export function dataDeHojeBrasil(): string {
  return formatDateInput(new Date());
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(parseData(date), { locale: ptBR, addSuffix: true });
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 11 ? formatCNPJ(value) : formatCPF(value);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

export function formatPlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Diferença em dias de calendário entre duas datas, sempre contada no fuso de Brasília — nunca
 * no fuso ambiente de onde o código roda. `Date.prototype.setHours` (usado numa versão anterior
 * desta função) zera a hora no fuso ambiente: no servidor da Vercel (UTC), isso arredondava
 * "agora" pro dia seguinte durante as últimas ~3h de cada dia em Brasília (quando em UTC já é
 * amanhã), inflando em 1 os dias de atraso — e por consequência a multa/juros — nesse horário
 * todo santo dia. Extrai a data-calendário de cada lado via `formatDateInput` (que já usa o fuso
 * de Brasília de propósito) e diferencia como inteiros puros, sem depender de fuso nenhum. */
export function daysBetween(a: Date | string, b: Date | string): number {
  const [anoA, mesA, diaA] = formatDateInput(a).split("-").map(Number);
  const [anoB, mesB, diaB] = formatDateInput(b).split("-").map(Number);
  const ms = Date.UTC(anoB, mesB - 1, diaB) - Date.UTC(anoA, mesA - 1, diaA);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
