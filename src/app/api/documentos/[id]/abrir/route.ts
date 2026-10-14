import type { NextRequest } from "next/server";
import { gerarLinkParaAbrirDocumento } from "@/lib/server/documentos.service";
import { handleRoute, podeAcessarDocumento } from "@/lib/server/route-helpers";

/** Devolve um link assinado (válido por poucos minutos) pro arquivo de verdade no bucket privado
 * `comprovantes` — a equipe pode abrir qualquer documento, o cliente só os que são dele (via
 * `podeAcessarDocumento`, ver `route-helpers.ts`). Como resposta é JSON (não um redirect direto),
 * quem chamar essa rota (`abrirDocumento`, em `documentos.service.ts` no client) deve abrir a URL
 * recebida numa nova aba. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async (sessao) => {
    if (!(await podeAcessarDocumento(sessao, id))) {
      throw new Error("Sem permissão para acessar este recurso.");
    }
    const url = await gerarLinkParaAbrirDocumento(id);
    return { url };
  });
}
