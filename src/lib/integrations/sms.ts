export interface SmsProvider {
  enviarCodigo(telefone: string): Promise<{ codigo: string }>;
}

// TODO(integração real): substituir por provedor de SMS (ex.: Twilio, Zenvia).
const mockSmsProvider: SmsProvider = {
  async enviarCodigo() {
    return { codigo: "123456" };
  },
};

export const smsProvider: SmsProvider = mockSmsProvider;
