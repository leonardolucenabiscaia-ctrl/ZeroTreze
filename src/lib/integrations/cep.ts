export interface EnderecoPorCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface CepProvider {
  buscarEndereco(cep: string): Promise<EnderecoPorCep | null>;
}

/**
 * Diferente das demais integrações deste projeto, a busca de CEP usa a API
 * pública da ViaCEP de verdade — é gratuita, não exige credenciais e é segura
 * para chamar direto do cliente, então não faz sentido mockar.
 */
const viaCepProvider: CepProvider = {
  async buscarEndereco(cepBruto: string) {
    const cep = cepBruto.replace(/\D/g, "");
    if (cep.length !== 8) return null;

    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!resposta.ok) return null;

    const dados = await resposta.json();
    if (dados.erro) return null;

    return {
      logradouro: dados.logradouro ?? "",
      bairro: dados.bairro ?? "",
      cidade: dados.localidade ?? "",
      estado: dados.uf ?? "",
    };
  },
};

export const cepProvider: CepProvider = viaCepProvider;
