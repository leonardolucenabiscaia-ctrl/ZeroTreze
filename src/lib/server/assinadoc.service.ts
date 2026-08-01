import "server-only";

const ASSINADOC_BASE_URL = "https://app.assinadoc.com/api";

export interface EnviarParaAssinaturaInput {
  nomeArquivo: string;
  pdfBuffer: Buffer;
  emailSignatario: string;
  mensagem: string;
}

export interface RespostaEnvioAssinaDoc {
  requestId: number;
  signingKey: string;
  documentKey: string;
  status: string;
}

/**
 * Faz upload de um PDF e já dispara a solicitação de assinatura em uma única chamada
 * (`POST /files/upload/requests`) — ver https://assinadoc.readme.io/reference/post-upload-and-send-request.
 *
 * Duas coisas que a documentação não deixa claras (descobertas testando contra a API real):
 * 1. O campo `file` exige `multipart/form-data` de verdade — enviar como string base64 num
 *    corpo JSON retorna 422 "The file must be a file.".
 * 2. `data` na resposta é um **array** (um item por destinatário em `email[]`), não um objeto
 *    único como o exemplo da doc sugere.
 */
export async function enviarDocumentoParaAssinatura(
  dados: EnviarParaAssinaturaInput
): Promise<RespostaEnvioAssinaDoc> {
  const token = process.env.ASSINADOC_API_TOKEN;
  if (!token) throw new Error("ASSINADOC_API_TOKEN não configurado.");

  const form = new FormData();
  form.append("name", dados.nomeArquivo);
  form.append("file", new Blob([new Uint8Array(dados.pdfBuffer)], { type: "application/pdf" }), "contrato.pdf");
  form.append("email[]", dados.emailSignatario);
  form.append("message", dados.mensagem);
  form.append("chain", "0");
  form.append("signature_type", "all");

  const res = await fetch(`${ASSINADOC_BASE_URL}/files/upload/requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: form,
  });

  const json = await res.json().catch(() => null);
  const solicitacao = Array.isArray(json?.data) ? json.data[0] : json?.data;
  if (!res.ok || !solicitacao) {
    throw new Error(json?.message ?? `Falha ao enviar documento para assinatura (HTTP ${res.status}).`);
  }

  return {
    requestId: solicitacao.id,
    signingKey: solicitacao.signing_key,
    documentKey: solicitacao.document,
    status: solicitacao.status,
  };
}
