import type { NextRequest } from "next/server";
import { colocarVeiculoEmManutencao, retirarVeiculoDeManutencao } from "@/lib/server/veiculos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async () => {
      const { tipo } = await request.json();
      if (tipo !== "mecanica" && tipo !== "funilaria") {
        throw new Error('Tipo inválido — use "mecanica" ou "funilaria".');
      }
      return colocarVeiculoEmManutencao(id, tipo);
    },
    200,
    PERFIS_STAFF
  );
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => retirarVeiculoDeManutencao(id), 200, PERFIS_STAFF);
}
