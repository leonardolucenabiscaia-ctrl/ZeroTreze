import { faker } from "@faker-js/faker/locale/pt_BR";
import { addMonths } from "date-fns";
import type { HistoricoManutencao, Veiculo } from "@/lib/types";
import { fotoDoVeiculo } from "./veiculo-foto";

const MARCAS_MODELOS: Record<string, string[]> = {
  Chevrolet: ["Onix", "Tracker", "S10", "Spin"],
  Volkswagen: ["Polo", "T-Cross", "Nivus", "Saveiro"],
  Fiat: ["Argo", "Toro", "Strada", "Pulse"],
  Toyota: ["Corolla", "Hilux", "Yaris", "Corolla Cross"],
  Hyundai: ["HB20", "Creta", "Tucson"],
  Renault: ["Kwid", "Duster", "Oroch"],
};

const CORES = ["Branco", "Prata", "Preto", "Cinza", "Vermelho", "Azul"];
const CATEGORIAS = ["Hatch", "Sedan", "SUV", "Picape", "Utilitário"];
const COMBUSTIVEIS = ["Flex", "Diesel", "Híbrido"];

function gerarPlaca(): string {
  const letras = faker.string.alpha({ length: 3, casing: "upper" });
  const numeros = faker.string.numeric(1);
  const letraFinal = faker.string.alpha({ length: 1, casing: "upper" });
  const numerosFinais = faker.string.numeric(2);
  return `${letras}${numeros}${letraFinal}${numerosFinais}`;
}

function gerarHistoricoManutencao(km: number): HistoricoManutencao[] {
  const total = faker.number.int({ min: 1, max: 4 });
  return Array.from({ length: total }, () => ({
    id: faker.string.uuid(),
    data: faker.date.past({ years: 2 }).toISOString(),
    km: faker.number.int({ min: 0, max: km }),
    descricao: faker.helpers.arrayElement([
      "Troca de óleo e filtros",
      "Revisão dos freios",
      "Alinhamento e balanceamento",
      "Troca de pastilhas de freio",
      "Revisão programada",
    ]),
    oficina: faker.helpers.arrayElement([
      "Oficina Autorizada Zero Treze",
      "Concessionária Central",
      "Rede Credenciada Sul",
    ]),
  }));
}

export function gerarVeiculo(): Veiculo {
  const marca = faker.helpers.arrayElement(Object.keys(MARCAS_MODELOS));
  const modelo = faker.helpers.arrayElement(MARCAS_MODELOS[marca]);
  const km = faker.number.int({ min: 5000, max: 80000 });
  const ultimaRevisao = faker.date.past({ years: 1 });

  return {
    id: faker.string.uuid(),
    modelo,
    marca,
    ano: faker.number.int({ min: 2021, max: 2025 }),
    cor: faker.helpers.arrayElement(CORES),
    placa: gerarPlaca(),
    renavam: faker.string.numeric(11),
    chassi: faker.string.alphanumeric({ length: 17, casing: "upper" }),
    categoria: faker.helpers.arrayElement(CATEGORIAS),
    combustivel: faker.helpers.arrayElement(COMBUSTIVEIS),
    quilometragem: km,
    fotoUrl: fotoDoVeiculo(marca, modelo),
    ultimaRevisao: ultimaRevisao.toISOString(),
    proximaRevisao: addMonths(ultimaRevisao, 6).toISOString(),
    seguradora: faker.helpers.arrayElement(["Porto Seguro", "Azul Seguros", "HDI Seguros"]),
    numeroApolice: faker.string.numeric(10),
    assistencia247: true,
    garantiaAte: addMonths(new Date(), 12).toISOString(),
    historicoManutencao: gerarHistoricoManutencao(km),
    bloqueado: false,
  };
}
