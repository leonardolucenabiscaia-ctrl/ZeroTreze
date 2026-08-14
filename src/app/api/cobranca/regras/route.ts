import { listarRegrasCobranca } from "@/lib/server/cobranca.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET() {
  return handleRoute(() => listarRegrasCobranca(), 200, PERFIS_STAFF);
}
