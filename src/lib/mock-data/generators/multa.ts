import { faker } from "@faker-js/faker/locale/pt_BR";
import { addDays } from "date-fns";
import type { Multa, StatusMulta } from "@/lib/types";

const ORGAOS = ["DETRAN-SP", "DETRAN-RJ", "DETRAN-MG", "Prefeitura Municipal", "PRF"];
const INFRACOES: { descricao: string; pontos: number }[] = [
  { descricao: "Excesso de velocidade até 20%", pontos: 4 },
  { descricao: "Estacionar em local proibido", pontos: 5 },
  { descricao: "Avançar sinal vermelho", pontos: 7 },
  { descricao: "Utilizar celular ao dirigir", pontos: 5 },
  { descricao: "Não uso do cinto de segurança", pontos: 5 },
];

export function gerarMulta(contratoId: string): Multa {
  const data = faker.date.past({ years: 1 });
  const vencimento = addDays(data, 30);
  const dataRegistro = addDays(data, faker.number.int({ min: 1, max: 10 }));
  const situacao: StatusMulta = faker.helpers.arrayElement([
    "pendente",
    "paga",
    "vencida",
    "recorrida",
  ]);
  const infracao = faker.helpers.arrayElement(INFRACOES);

  // Multas do dataset de demonstração são retroativas a esta funcionalidade, então já nascem com
  // ciência confirmada (senão todo cliente com histórico de multa ficaria bloqueado no primeiro
  // login). Só multas registradas a partir de agora, pelo admin, nascem sem `cienciaEm`.
  const cienciaEm = faker.date.soon({ days: 3, refDate: dataRegistro });

  return {
    id: faker.string.uuid(),
    contratoId,
    numeroAuto: faker.string.numeric(10),
    orgao: faker.helpers.arrayElement(ORGAOS),
    data: data.toISOString(),
    descricao: infracao.descricao,
    valor: faker.number.float({ min: 130, max: 880, fractionDigits: 2 }),
    vencimento: vencimento.toISOString(),
    situacao,
    pontos: infracao.pontos,
    dataRegistro: dataRegistro.toISOString(),
    cienciaEm: cienciaEm.toISOString(),
  };
}
