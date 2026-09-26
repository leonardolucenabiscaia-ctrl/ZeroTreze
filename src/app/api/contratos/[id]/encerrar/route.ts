import type { NextRequest } from "next/server";
import { encerrarContrato } from "@/lib/server/contratos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => encerrarContrato(id), 200, PERFIS_STAFF);
}
