import { listarRegrasCobranca } from "@/lib/server/cobranca.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => listarRegrasCobranca());
}
