import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

const BUCKET_COMPROVANTES = "comprovantes";

/** Nome original sanitizado — vira parte do caminho no Storage, então não pode ter barra, espaço
 * ou acentuação que confunda o header `Content-Disposition` no download. */
function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .slice(-100);
}

/**
 * Sobe um anexo de verdade pro bucket privado `comprovantes` (comprovante de pagamento, documento
 * de cadastro de cliente/veículo, anexo de acordo) e devolve o CAMINHO dentro do bucket — não uma
 * URL pública, já que o bucket é privado. Quem precisar exibir/baixar o arquivo depois gera um
 * link assinado temporário na hora (ver `GET /api/documentos/[id]/abrir`), em vez de guardar uma
 * URL fixa que teria validade limitada ou exporia o arquivo publicamente.
 *
 * `documentoId` (pré-gerado por quem chama, antes do insert na tabela `documentos`) prefixa o
 * caminho pra cada arquivo ter um nome único no bucket mesmo que dois anexos cheguem com o mesmo
 * nome original no mesmo envio.
 */
export async function enviarDocumentoParaStorage(
  supabase: ReturnType<typeof createAdminClient>,
  documentoId: string,
  arquivo: File
): Promise<string> {
  const caminho = `${documentoId}-${sanitizarNomeArquivo(arquivo.name)}`;
  const { error } = await supabase.storage
    .from(BUCKET_COMPROVANTES)
    .upload(caminho, await arquivo.arrayBuffer(), { contentType: arquivo.type, upsert: true });
  if (error) throw new Error(`Não foi possível enviar o arquivo "${arquivo.name}": ${error.message}`);
  return caminho;
}

/** Gera um link temporário (expira em 5 minutos) pra abrir um arquivo do bucket privado
 * `comprovantes` — nunca um link permanente, pra não vazar o documento se esse link escapar
 * (print, encaminhado por engano etc.). */
export async function gerarLinkTemporarioDocumento(
  supabase: ReturnType<typeof createAdminClient>,
  caminho: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_COMPROVANTES)
    .createSignedUrl(caminho, 5 * 60);
  if (error || !data) throw new Error(error?.message ?? "Não foi possível gerar o link do arquivo.");
  return data.signedUrl;
}
