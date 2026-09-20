import type { NextRequest } from "next/server";
import { confirmarPagamentoParcial } from "@/lib/server/pagamentos-parciais.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => confirmarPagamentoParcial(id));
}
