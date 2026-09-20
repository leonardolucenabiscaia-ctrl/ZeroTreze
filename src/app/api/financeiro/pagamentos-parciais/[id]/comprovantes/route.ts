import type { NextRequest } from "next/server";
import { listarComprovantesPorPagamentoParcial } from "@/lib/server/pagamentos-parciais.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => listarComprovantesPorPagamentoParcial(id));
}
