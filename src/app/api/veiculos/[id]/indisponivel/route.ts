import type { NextRequest } from "next/server";
import { marcarVeiculoIndisponivel, marcarVeiculoDisponivel } from "@/lib/server/veiculos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => marcarVeiculoIndisponivel(id), 200, PERFIS_STAFF);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => marcarVeiculoDisponivel(id), 200, PERFIS_STAFF);
}
