import type { NextRequest } from "next/server";
import { listarComprovantesPorPagamentoParcialAcordo } from "@/lib/server/pagamentos-parciais-acordo.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => listarComprovantesPorPagamentoParcialAcordo(id));
}
