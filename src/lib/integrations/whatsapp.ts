import "server-only";

export interface WhatsAppProvider {
  enviarMensagem(telefone: string, mensagem: string): Promise<{ enviado: boolean }>;
  enviarCodigoAcesso(telefone: string, codigo: string): Promise<{ enviado: boolean }>;
  enviarTemplate(telefone: string, nomeTemplate: string, parametros: string[]): Promise<{ enviado: boolean }>;
}

const API_VERSION = "v21.0";

/** Remove tudo que não é dígito e garante o "55" (Brasil) na frente — a Cloud API exige o
 * telefone em formato E.164 sem "+" (ex.: 5513992030351). */
function normalizarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

async function chamarCloudApi(corpo: Record<string, unknown>): Promise<{ enviado: boolean }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.error("[whatsapp] WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID não configurados.");
    return { enviado: false };
  }

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  if (!res.ok) {
    console.error("[whatsapp] Falha ao enviar mensagem:", res.status, await res.text());
    return { enviado: false };
  }
  return { enviado: true };
}

/** Mensagem iniciada pela empresa (fora da janela de 24h de conversa) — precisa obrigatoriamente
 * de um template pré-aprovado pela Meta, não dá pra mandar texto livre. `parametros` preenche as
 * variáveis {{1}}, {{2}}... do corpo do template, na ordem. */
async function enviarTemplateGenerico(
  telefone: string,
  nomeTemplate: string,
  parametros: string[]
): Promise<{ enviado: boolean }> {
  return chamarCloudApi({
    messaging_product: "whatsapp",
    to: normalizarTelefone(telefone),
    type: "template",
    template: {
      name: nomeTemplate,
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: parametros.map((texto) => ({ type: "text", text: texto })),
        },
      ],
    },
  });
}

const cloudApiProvider: WhatsAppProvider = {
  async enviarMensagem(telefone, mensagem) {
    return chamarCloudApi({
      messaging_product: "whatsapp",
      to: normalizarTelefone(telefone),
      type: "text",
      text: { body: mensagem },
    });
  },

  async enviarCodigoAcesso(telefone, codigo) {
    const nomeTemplate = process.env.WHATSAPP_TEMPLATE_CODIGO_ACESSO;
    if (!nomeTemplate) {
      console.error("[whatsapp] WHATSAPP_TEMPLATE_CODIGO_ACESSO não configurado.");
      return { enviado: false };
    }
    return enviarTemplateGenerico(telefone, nomeTemplate, [codigo]);
  },

  async enviarTemplate(telefone, nomeTemplate, parametros) {
    return enviarTemplateGenerico(telefone, nomeTemplate, parametros);
  },
};

export const whatsappProvider: WhatsAppProvider = cloudApiProvider;
