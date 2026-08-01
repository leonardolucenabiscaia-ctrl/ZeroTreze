export interface DadosBancarios {
  banco: string;
  agencia: string;
  conta: string;
  chavePix: string;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface DadosCNH {
  numero: string;
  validade: string;
}

export interface Cliente {
  id: string;
  usuarioId: string;
  nome: string;
  tipoDocumento: "cpf" | "cnpj";
  documento: string;
  rg: string;
  nacionalidade: string;
  profissao: string;
  dataNascimento: string;
  cnh: DadosCNH;
  endereco: Endereco;
  dadosBancarios: DadosBancarios;
  clienteDesde: string;
}
