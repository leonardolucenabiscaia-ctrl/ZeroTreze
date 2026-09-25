import { buscarChamadoPorId } from "@/lib/server/chamados.service";
import { buscarClientePorUsuarioId } from "@/lib/server/clientes.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async ({ userId, perfil }) => {
    const chamado = await buscarChamadoPorId(id);
    if (!chamado) return chamado;
    // Equipe vê qualquer chamado; cliente só o próprio.
    if (perfil && PERFIS_STAFF.includes(perfil)) return chamado;
    const cliente = await buscarClientePorUsuarioId(userId);
    if (!cliente || cliente.id !== chamado.clienteId) return undefined;
    return chamado;
  });
}
