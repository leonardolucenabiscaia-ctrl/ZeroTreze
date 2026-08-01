const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = [
  "dez", "onze", "doze", "treze", "quatorze", "quinze",
  "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function grupoTresDigitos(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";

  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];

  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
    else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      partes.push(unidade === 0 ? DEZENAS[dezena] : `${DEZENAS[dezena]} e ${UNIDADES[unidade]}`);
    }
  }

  return partes.join(" e ");
}

/** Converte um número inteiro para sua forma por extenso (ex.: "seis", "vinte e quatro"). */
export function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";

  const milhar = Math.floor(n / 1000);
  const resto = n % 1000;
  const partes: string[] = [];

  if (milhar > 0) {
    partes.push(milhar === 1 ? "mil" : `${grupoTresDigitos(milhar)} mil`);
  }

  if (resto > 0) {
    partes.push(grupoTresDigitos(resto));
  }

  const usaConectivo = milhar > 0 && resto > 0 && (resto < 100 || resto % 100 === 0);
  return partes.join(usaConectivo ? " e " : " ").trim();
}

/** Converte um valor monetário em reais para sua forma por extenso (ex.: "oitocentos reais"). */
export function valorPorExtenso(valor: number): string {
  const inteiro = Math.floor(Math.round(valor * 100) / 100);
  const centavos = Math.round((valor - inteiro) * 100);

  const parteReais = `${inteiroPorExtenso(inteiro)} ${inteiro === 1 ? "real" : "reais"}`;

  if (centavos === 0) return parteReais;

  const parteCentavos = `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return `${parteReais} e ${parteCentavos}`;
}
