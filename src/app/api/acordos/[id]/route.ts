import { atualizarAcordo, buscarAcordoPorId } from "@/lib/server/acordos.service";
import { handleRoute, PERFIS_ADMIN } from "@/lib/server/route-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => buscarAcordoPorId(id));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      const dados = await request.json();
      return atualizarAcordo(id, dados);
    },
    200,
    PERFIS_ADMIN
  );
}
