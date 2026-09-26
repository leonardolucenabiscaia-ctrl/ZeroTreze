import type { NextRequest } from "next/server";
import { confirmarPagamentoParcialMulta } from "@/lib/server/pagamentos-parciais-multa.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => confirmarPagamentoParcialMulta(id), 200, PERFIS_STAFF);
}
