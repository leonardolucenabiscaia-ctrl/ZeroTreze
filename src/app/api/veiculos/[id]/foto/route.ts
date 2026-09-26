import type { NextRequest } from "next/server";
import { atualizarFotoVeiculo } from "@/lib/server/veiculos.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const formData = await request.formData();
    const foto = formData.get("foto");
    if (!(foto instanceof File)) throw new Error("Nenhuma foto enviada.");
    return atualizarFotoVeiculo(id, foto);
  });
}
