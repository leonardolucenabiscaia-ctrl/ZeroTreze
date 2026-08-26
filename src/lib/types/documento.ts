export type CategoriaDocumento =
  | "contrato"
  | "crlv"
  | "licenciamento"
  | "apolice"
  | "comprovante"
  | "boleto"
  | "nota_fiscal"
  | "recibo"
  | "cadastro"
  | "acordo";

export interface Documento {
  id: string;
  clienteId?: string;
  contratoId?: string;
  veiculoId?: string;
  parcelaId?: string;
  parcelaAcordoId?: string;
  acordoId?: string;
  categoria: CategoriaDocumento;
  nome: string;
  url: string;
  tamanhoKb: number;
  criadoEm: string;
}
