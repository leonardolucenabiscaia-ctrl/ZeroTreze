export interface ErpCrmProvider {
  sincronizarCliente(clienteId: string): Promise<{ sincronizado: boolean }>;
}

// TODO(integração real): substituir por conector do ERP/CRM interno da Zero Treze.
const mockErpCrmProvider: ErpCrmProvider = {
  async sincronizarCliente() {
    return { sincronizado: true };
  },
};

export const erpCrmProvider: ErpCrmProvider = mockErpCrmProvider;
