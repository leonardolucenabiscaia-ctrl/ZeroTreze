export interface PaymentGatewayProvider {
  processarPagamentoCartao(valor: number): Promise<{ aprovado: boolean; transacaoId: string }>;
}

// TODO(integração real): substituir por gateway de pagamento (ex.: Stripe, Pagar.me).
const mockPaymentGatewayProvider: PaymentGatewayProvider = {
  async processarPagamentoCartao() {
    return { aprovado: true, transacaoId: crypto.randomUUID() };
  },
};

export const paymentGatewayProvider: PaymentGatewayProvider = mockPaymentGatewayProvider;
