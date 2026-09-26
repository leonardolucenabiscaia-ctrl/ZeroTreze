import { confirmarCienciaMulta } from "@/lib/server/multas.service";
import { handleRoute, podeAcessarMulta } from "@/lib/server/route-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async (sessao) => {
    if (!(await podeAcessarMulta(sessao, id))) throw new Error("Sem permissão para acessar este recurso.");
    return confirmarCienciaMulta(id);
  });
}
