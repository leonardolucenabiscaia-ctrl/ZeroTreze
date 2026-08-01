export interface WhatsAppProvider {
  enviarMensagem(telefone: string, mensagem: string): Promise<{ enviado: boolean }>;
}

// TODO(integração real): substituir por WhatsApp Business API (Meta Cloud API ou BSP).
const mockWhatsAppProvider: WhatsAppProvider = {
  async enviarMensagem() {
    return { enviado: true };
  },
};

export const whatsappProvider: WhatsAppProvider = mockWhatsAppProvider;
