import "server-only";
import crypto from "node:crypto";

export interface EnviarParaAssinaturaInput {
  nomeArquivo: string;
  pdfBuffer: Buffer;
  emailSignatario: string;
  nomeSignatario: string;
  mensagem: string;
}

export interface RespostaEnvioDocuSign {
  envelopeId: string;
  status: string;
}

function base64Url(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Monta e assina o JWT do fluxo "JWT Grant" da DocuSign (autenticação servidor-a-servidor, sem
 * interação do usuário) — exige consentimento prévio concedido uma única vez pelo usuário
 * impersonado (ver `DOCUSIGN_USER_ID`). */
function montarJwtAssertion(): string {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const chavePrivada = process.env.DOCUSIGN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!integrationKey || !userId || !authServer || !chavePrivada) {
    throw new Error("Credenciais da DocuSign não configuradas (DOCUSIGN_*).");
  }

  const agora = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: authServer,
    iat: agora,
    exp: agora + 3600,
    scope: "signature impersonation",
  };

  const cabecalhoCodificado = base64Url(JSON.stringify(header));
  const payloadCodificado = base64Url(JSON.stringify(payload));
  const entradaAssinatura = `${cabecalhoCodificado}.${payloadCodificado}`;

  const assinador = crypto.createSign("RSA-SHA256");
  assinador.update(entradaAssinatura);
  const assinatura = assinador.sign(chavePrivada);

  return `${entradaAssinatura}.${base64Url(assinatura)}`;
}

async function obterAccessToken(): Promise<string> {
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const jwt = montarJwtAssertion();

  const res = await fetch(`https://${authServer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    throw new Error(
      json?.error_description ?? json?.error ?? `Falha ao obter token de acesso da DocuSign (HTTP ${res.status}).`
    );
  }
  return json.access_token;
}

/**
 * Envia um "envelope" (documento + destinatário) para assinatura via DocuSign eSignature API —
 * ver https://developers.docusign.com (REST API v2.1, `POST /accounts/{accountId}/envelopes`).
 *
 * O campo de assinatura é posicionado por âncora de texto (`anchorString`) — o PDF precisa conter
 * o marcador único `/assinatura_cliente/` (ver `contrato-pdf.tsx`), já que "CONTRATANTE" aparece
 * dezenas de vezes no texto do contrato e não serviria como âncora única.
 */
export async function enviarDocumentoParaAssinatura(
  dados: EnviarParaAssinaturaInput
): Promise<RespostaEnvioDocuSign> {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const baseUri = process.env.DOCUSIGN_BASE_URI;
  if (!accountId || !baseUri) throw new Error("DOCUSIGN_ACCOUNT_ID/DOCUSIGN_BASE_URI não configurados.");

  const accessToken = await obterAccessToken();

  const corpo = {
    emailSubject: "Contrato Zero Treze Transportes para assinatura",
    emailBlurb: dados.mensagem,
    documents: [
      {
        documentBase64: dados.pdfBuffer.toString("base64"),
        name: dados.nomeArquivo,
        fileExtension: "pdf",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: dados.emailSignatario,
          name: dados.nomeSignatario,
          recipientId: "1",
          routingOrder: "1",
          tabs: {
            signHereTabs: [
              {
                anchorString: "/assinatura_cliente/",
                anchorUnits: "pixels",
                anchorXOffset: "0",
                anchorYOffset: "-10",
              },
            ],
          },
        },
      ],
    },
    status: "sent",
  };

  const res = await fetch(`${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(corpo),
  });

  const texto = await res.text();
  const json = ((): Record<string, unknown> | null => {
    try {
      return JSON.parse(texto);
    } catch {
      return null;
    }
  })();

  if (!res.ok || !json?.envelopeId) {
    throw new Error(`Falha ao enviar envelope para a DocuSign (HTTP ${res.status}): ${texto.slice(0, 500)}`);
  }

  return {
    envelopeId: json.envelopeId as string,
    status: json.status as string,
  };
}
