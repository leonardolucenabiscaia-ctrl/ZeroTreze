export interface BoletoProvider {
  gerarBoleto(valor: number, vencimento: string, identificador: string): Promise<{
    linhaDigitavel: string;
    urlPdf: string;
  }>;
}

// TODO(integração real): substituir por client de um banco/gateway de boletos.
const mockBoletoProvider: BoletoProvider = {
  async gerarBoleto(valor, vencimento, identificador) {
    void valor;
    void vencimento;
    return {
      linhaDigitavel: `34191.79001 01043.510047 91020.150008 8 ${Date.now().toString().slice(-14)}`,
      urlPdf: `/mock/documentos/boleto-${identificador}.pdf`,
    };
  },
};

export const boletoProvider: BoletoProvider = mockBoletoProvider;
