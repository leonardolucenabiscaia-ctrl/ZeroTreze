import { buscarAcordoPorId } from "@/lib/server/acordos.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => buscarAcordoPorId(id));
}
