import { faker } from "@faker-js/faker/locale/pt_BR";
import type { CategoriaDocumento, Documento } from "@/lib/types";

const CATEGORIAS: { categoria: CategoriaDocumento; nome: string }[] = [
  { categoria: "contrato", nome: "Contrato de Locação.pdf" },
  { categoria: "crlv", nome: "CRLV Digital.pdf" },
  { categoria: "licenciamento", nome: "Licenciamento Anual.pdf" },
  { categoria: "apolice", nome: "Apólice de Seguro.pdf" },
  { categoria: "comprovante", nome: "Comprovante de Residência.pdf" },
  { categoria: "boleto", nome: "Boleto Parcela.pdf" },
  { categoria: "nota_fiscal", nome: "Nota Fiscal de Locação.pdf" },
  { categoria: "recibo", nome: "Recibo de Pagamento.pdf" },
];

export function gerarDocumentosParaContrato(clienteId: string, contratoId: string): Documento[] {
  return CATEGORIAS.map(({ categoria, nome }) => ({
    id: faker.string.uuid(),
    clienteId,
    contratoId,
    categoria,
    nome,
    url: "/mock/documentos/exemplo.pdf",
    tamanhoKb: faker.number.int({ min: 80, max: 2400 }),
    criadoEm: faker.date.past({ years: 1 }).toISOString(),
  }));
}
