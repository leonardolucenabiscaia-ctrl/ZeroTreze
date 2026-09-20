import type { NextRequest } from "next/server";
import { recusarPagamentoParcialAcordo } from "@/lib/server/pagamentos-parciais-acordo.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => recusarPagamentoParcialAcordo(id), 200, PERFIS_STAFF);
}
