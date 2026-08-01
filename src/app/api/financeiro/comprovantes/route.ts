import type { NextRequest } from "next/server";
import { listarComprovantesPorParcela } from "@/lib/server/financeiro.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const parcelaId = request.nextUrl.searchParams.get("parcelaId");
  return handleRoute(() => (parcelaId ? listarComprovantesPorParcela(parcelaId) : Promise.resolve([])));
}
