import { confirmarCienciaMulta } from "@/lib/server/multas.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => confirmarCienciaMulta(id));
}
