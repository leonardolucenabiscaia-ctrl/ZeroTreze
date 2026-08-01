import { faker } from "@faker-js/faker/locale/pt_BR";
import { addYears } from "date-fns";
import type { Cliente, Usuario } from "@/lib/types";

function calcularDigitoCPF(digitos: number[], tamanho: number): number {
  let soma = 0;
  for (let i = 0; i < tamanho; i++) {
    soma += digitos[i] * (tamanho + 1 - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

function gerarCPF(): string {
  const base = Array.from({ length: 9 }, () => faker.number.int({ min: 0, max: 9 }));
  const d1 = calcularDigitoCPF(base, 9);
  const d2 = calcularDigitoCPF([...base, d1], 10);
  return [...base, d1, d2].join("");
}

const BANCOS = ["Nubank", "Itaú", "Bradesco", "Banco do Brasil", "Santander", "Inter"];

export function gerarUsuarioCliente(nome: string, email: string, documento: string): Usuario {
  return {
    id: faker.string.uuid(),
    nome,
    email,
    telefone: faker.phone.number({ style: "national" }),
    cpfCnpj: documento,
    perfil: "cliente",
    fotoUrl: faker.image.avatar(),
    preferenciasNotificacao: { sms: true, whatsapp: true, email: true, push: true },
    criadoEm: faker.date.past({ years: 3 }).toISOString(),
  };
}

export function gerarCliente(usuarioId: string, nome: string): Cliente {
  const documento = gerarCPF();
  const dataNascimento = faker.date.birthdate({ min: 21, max: 68, mode: "age" });
  const cnhEmitidaEm = faker.date.past({ years: 6, refDate: new Date() });

  return {
    id: faker.string.uuid(),
    usuarioId,
    nome,
    tipoDocumento: "cpf",
    documento,
    rg: `${faker.string.numeric(2)}.${faker.string.numeric(3)}.${faker.string.numeric(3)}-${faker.string.numeric(1)}`,
    nacionalidade: "Brasileira",
    profissao: faker.person.jobTitle(),
    dataNascimento: dataNascimento.toISOString(),
    cnh: {
      numero: faker.string.numeric(11),
      validade: addYears(cnhEmitidaEm, 10).toISOString(),
    },
    endereco: {
      logradouro: faker.location.street(),
      numero: faker.location.buildingNumber(),
      bairro: faker.location.county(),
      cidade: faker.location.city(),
      estado: faker.location.state({ abbreviated: true }),
      cep: faker.location.zipCode("#####-###"),
    },
    dadosBancarios: {
      banco: faker.helpers.arrayElement(BANCOS),
      agencia: faker.string.numeric(4),
      conta: `${faker.string.numeric(6)}-${faker.string.numeric(1)}`,
      chavePix: documento,
    },
    clienteDesde: faker.date.past({ years: 4 }).toISOString(),
  };
}
