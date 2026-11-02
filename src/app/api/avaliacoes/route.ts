import type { NextRequest } from "next/server";
import { z } from "zod";
import { criarAvaliacao } from "@/lib/server/avaliacoes.service";
import { buscarChamadoPorId } from "@/lib/server/chamados.service";
import { handleRoute, podeAcessarChamado } from "@/lib/server/route-helpers";

const schemaAvaliacao = z.object({
  chamadoId: z.string().uuid(),
  clienteId: z.string().uuid(),
  notaAtendimento: z.number().int().min(1).max(5),
  notaTempo: z.number().int().min(1).max(5),
  notaQualidade: z.number().int().min(1).max(5),
  notaEducacao: z.number().int().min(1).max(5),
  notaResolucao: z.number().int().min(1).max(5),
  comentario: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  return handleRoute(async (sessao) => {
    const dados = schemaAvaliacao.parse(await request.json());

    // Sem essa checagem, qualquer usuário autenticado podia mandar um `chamadoId`/`clienteId`
    // arbitrário no corpo e gravar uma avaliação em nome de outro cliente/chamado que não é seu.
    if (!(await podeAcessarChamado(sessao, dados.chamadoId))) {
      throw new Error("Sem permissão para acessar este recurso.");
    }
    const chamado = await buscarChamadoPorId(dados.chamadoId);
    if (!chamado || chamado.clienteId !== dados.clienteId) {
      throw new Error("Chamado e cliente informados não correspondem.");
    }

    return criarAvaliacao(dados);
  }, 201);
}
