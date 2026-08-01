export interface RastreamentoProvider {
  obterPosicaoAtual(veiculoId: string): Promise<{ latitude: number; longitude: number } | null>;
}

// TODO(integração real): substituir por provedor de rastreamento veicular (ex.: Sascar, Autotrac).
const mockRastreamentoProvider: RastreamentoProvider = {
  async obterPosicaoAtual() {
    return null;
  },
};

export const rastreamentoProvider: RastreamentoProvider = mockRastreamentoProvider;
