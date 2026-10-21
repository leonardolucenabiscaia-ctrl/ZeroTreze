import type { NextRequest } from "next/server";
import { listarAnexosChecklistContrato } from "@/lib/server/contratos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => listarAnexosChecklistContrato(id), 200, PERFIS_STAFF);
}
