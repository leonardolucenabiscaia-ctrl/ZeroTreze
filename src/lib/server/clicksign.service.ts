import "server-only";

export interface EnviarParaAssinaturaInput {
  nomeArquivo: string;
  pdfBuffer: Buffer;
  emailSignatario: string;
  nomeSignatario: string;
  mensagem: string;
}

export interface RespostaEnvioClickSign {
  envelopeId: string;
  status: string;
}

interface ClickSignResource<A = Record<string, unknown>> {
  data: { id: string; type: string; attributes: A };
}

/** Chama a API v3 (Envelope) da ClickSign — JSON:API (`application/vnd.api+json`), autenticação
 * via Access Token direto no header `Authorization` (sem prefixo "Bearer"). */
async function clicksignFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.CLICKSIGN_ACCESS_TOKEN;
  const baseUrl = process.env.CLICKSIGN_BASE_URL;
  if (!token || !baseUrl) throw new Error("CLICKSIGN_ACCESS_TOKEN/CLICKSIGN_BASE_URL não configurados.");

  const res = await fetch(`${baseUrl}/api/v3${path}`, {
    ...init,
    headers: {
      Authorization: token,
      "Content-Type": "application/vnd.api+json",
      ...init.headers,
    },
  });

  const texto = await res.text();
  if (!res.ok) {
    throw new Error(`ClickSign ${init.method ?? "GET"} ${path} -> HTTP ${res.status}: ${texto.slice(0, 500)}`);
  }
  return (texto ? JSON.parse(texto) : null) as T;
}

async function criarEnvelope(nome: string): Promise<string> {
  const resp = await clicksignFetch<ClickSignResource>("/envelopes", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "envelopes",
        attributes: { name: nome, locale: "pt-BR", auto_close: true, remind_interval: "3" },
      },
    }),
  });
  return resp.data.id;
}

async function adicionarDocumento(envelopeId: string, nomeArquivo: string, pdfBuffer: Buffer): Promise<string> {
  const resp = await clicksignFetch<ClickSignResource>(`/envelopes/${envelopeId}/documents`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "documents",
        attributes: {
          filename: nomeArquivo.toLowerCase().endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`,
          content_base64: pdfBuffer.toString("base64"),
        },
      },
    }),
  });
  return resp.data.id;
}

async function adicionarSignatario(envelopeId: string, nome: string, email: string): Promise<string> {
  const resp = await clicksignFetch<ClickSignResource>(`/envelopes/${envelopeId}/signers`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "signers",
        attributes: {
          name: nome,
          email,
          has_documentation: false,
          refusable: true,
          communicate_events: {
            signature_request: "email",
            signature_reminder: "email",
            document_signed: "email",
          },
        },
      },
    }),
  });
  return resp.data.id;
}

async function criarRequisitoAssinatura(envelopeId: string, documentId: string, signerId: string): Promise<void> {
  await clicksignFetch(`/envelopes/${envelopeId}/requirements`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "requirements",
        attributes: { action: "agree", role: "sign" },
        relationships: {
          document: { data: { type: "documents", id: documentId } },
          signer: { data: { type: "signers", id: signerId } },
        },
      },
    }),
  });
}

async function ativarEnvelope(envelopeId: string): Promise<string> {
  const resp = await clicksignFetch<ClickSignResource<{ status: string }>>(`/envelopes/${envelopeId}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: { id: envelopeId, type: "envelopes", attributes: { status: "running" } },
    }),
  });
  return resp.data.attributes.status;
}

/**
 * Envia um documento para assinatura via ClickSign (API v3 — Envelope):
 * cria o envelope → sobe o PDF → cadastra o signatário → cria o requisito de assinatura
 * (vincula documento + signatário) → ativa o envelope (dispara o e-mail de assinatura).
 *
 * Diferente da DocuSign, a ClickSign não usa âncora de texto pra posicionar o campo de
 * assinatura — o requisito `role: "sign"` vale para o documento inteiro.
 */
export async function enviarDocumentoParaAssinatura(
  dados: EnviarParaAssinaturaInput
): Promise<RespostaEnvioClickSign> {
  const envelopeId = await criarEnvelope(dados.nomeArquivo);
  const documentId = await adicionarDocumento(envelopeId, dados.nomeArquivo, dados.pdfBuffer);
  const signerId = await adicionarSignatario(envelopeId, dados.nomeSignatario, dados.emailSignatario);
  await criarRequisitoAssinatura(envelopeId, documentId, signerId);
  const status = await ativarEnvelope(envelopeId);

  return { envelopeId, status };
}
