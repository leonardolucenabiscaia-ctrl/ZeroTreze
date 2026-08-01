export interface AssinaturaEletronicaProvider {
  disponivel: boolean;
  solicitarAssinatura(documentoId: string): Promise<{ status: "nao_disponivel" }>;
}

// TODO(integração real): substituir por provedor de assinatura eletrônica
// (ex.: Clicksign, DocuSign) quando o recurso for habilitado no produto.
const mockAssinaturaProvider: AssinaturaEletronicaProvider = {
  disponivel: false,
  async solicitarAssinatura() {
    return { status: "nao_disponivel" };
  },
};

export const assinaturaEletronicaProvider: AssinaturaEletronicaProvider = mockAssinaturaProvider;
