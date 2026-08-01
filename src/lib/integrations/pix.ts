export interface CobrancaPix {
  copiaECola: string;
  expiraEm: Date;
}

export interface PixProvider {
  gerarCobranca(valor: number, identificador: string): Promise<CobrancaPix>;
  consultarStatus(identificador: string): Promise<"pendente" | "pago" | "expirado">;
}

// TODO(integração real): substituir por client de um PSP (ex.: Efí, Mercado Pago),
// mantendo a interface PixProvider — nenhuma tela deve mudar.
const mockPixProvider: PixProvider = {
  async gerarCobranca(valor, identificador) {
    const payload = `00020126580014BR.GOV.BCB.PIX0136zerotreze-${identificador}5204000053039865406${valor.toFixed(2)}5802BR5913ZERO TREZE LTDA6009SAO PAULO62070503***6304`;
    return {
      copiaECola: payload,
      expiraEm: new Date(Date.now() + 30 * 60 * 1000),
    };
  },
  async consultarStatus() {
    return "pendente";
  },
};

export const pixProvider: PixProvider = mockPixProvider;
