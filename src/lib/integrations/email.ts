export interface EmailProvider {
  enviarCodigo(email: string): Promise<{ codigo: string }>;
  enviarNotificacao(email: string, assunto: string, corpo: string): Promise<{ enviado: boolean }>;
}

// TODO(integração real): substituir por provedor transacional (ex.: Resend, SendGrid).
const mockEmailProvider: EmailProvider = {
  async enviarCodigo() {
    return { codigo: "123456" };
  },
  async enviarNotificacao() {
    return { enviado: true };
  },
};

export const emailProvider: EmailProvider = mockEmailProvider;
