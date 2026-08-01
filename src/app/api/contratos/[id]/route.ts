import type { NextRequest } from "next/server";
import { buscarContratoPorId } from "@/lib/server/contratos.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => buscarContratoPorId(id));
}
