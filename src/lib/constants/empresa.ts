/** Dados fixos da Zero Treze Transportes usados no contrato-base impresso. */
export const EMPRESA = {
  razaoSocial: "ZERO TREZE TRANSPORTES LTDA",
  cnpj: "27.799.265/0001-58",
  endereco:
    "Rua Antônio Pereira Roque, nº 882, Parque Balneário Oasis, Peruíbe/SP, CEP: 11.750-000",
  socios: [
    { nome: "THYAGO ALBERTO PADULA BARBOSA", cpf: "340.932.218-39" },
    { nome: "MARCELO ALVES BISCAIA", cpf: "274.350.718-70" },
  ],
  contaBancaria: "SICREDI 0727 / 93007-5",
  chavePix: "27.799.265/0001-58",
  oficinaCredenciada: "ZTF AUTOMEC, localizada na Avenida Rangel Pestana 416 – Santos/SP",
  foro: "Santos/SP",
  franquiaProtecaoVeicular: 8000,
  multaKmNaoAvisado: 1000,
  custoAdministrativoMulta: 15,
  jurosMoraDiario: 5,
  multaAtrasoPercentual: 20,
  honorariosAdvocaticiosPercentual: 20,
  multaAcordoPercentual: 50,
  testemunhas: ["LEONI DA SILVA FALCÃO", "CAMILA CABRAL DOS SANTOS"],
  itensDevolucao: [
    { descricao: "Combustível", valor: "R$9,90/Litro" },
    { descricao: "Lavagem Simples", valor: "R$80,00" },
    { descricao: "Higienização", valor: "R$450,00" },
  ],
} as const;
