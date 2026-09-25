import { atualizarAcordo, buscarAcordoPorId } from "@/lib/server/acordos.service";
import { buscarClientePorUsuarioId } from "@/lib/server/clientes.service";
import { handleRoute, PERFIS_ADMIN, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async ({ userId, perfil }) => {
    const acordo = await buscarAcordoPorId(id);
    if (!acordo) return acordo;
    // Equipe vê qualquer acordo; cliente só o próprio.
    if (perfil && PERFIS_STAFF.includes(perfil)) return acordo;
    const cliente = await buscarClientePorUsuarioId(userId);
    if (!cliente || cliente.id !== acordo.clienteId) return undefined;
    return acordo;
  });
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
