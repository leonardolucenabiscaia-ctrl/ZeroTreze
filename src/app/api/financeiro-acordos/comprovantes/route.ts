import type { NextRequest } from "next/server";
import { listarComprovantesPorParcelaAcordo } from "@/lib/server/financeiro-acordos.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const parcelaAcordoId = request.nextUrl.searchParams.get("parcelaAcordoId");
  return handleRoute(() =>
    parcelaAcordoId ? listarComprovantesPorParcelaAcordo(parcelaAcordoId) : Promise.resolve([])
  );
}
