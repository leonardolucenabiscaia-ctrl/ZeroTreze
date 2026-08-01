import type { NextRequest } from "next/server";
import { confirmarPagamento } from "@/lib/server/financeiro.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => confirmarPagamento(id));
}
