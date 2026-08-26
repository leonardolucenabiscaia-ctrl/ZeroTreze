import type { NextRequest } from "next/server";
import { enviarComprovantePagamentoAcordo } from "@/lib/server/financeiro-acordos.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const formData = await request.formData();
    const formaPagamento = String(formData.get("formaPagamento") ?? "pix") as "pix" | "boleto";
    const anexos = formData.getAll("anexos").filter((v): v is File => v instanceof File);
    return enviarComprovantePagamentoAcordo(id, formaPagamento, anexos);
  });
}
