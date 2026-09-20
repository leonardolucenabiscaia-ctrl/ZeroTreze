import type { NextRequest } from "next/server";
import { enviarPagamentoParcial } from "@/lib/server/pagamentos-parciais.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async () => {
    const formData = await request.formData();
    const valor = Number(formData.get("valor"));
    const formaPagamento = String(formData.get("formaPagamento") ?? "pix") as
      | "pix"
      | "boleto"
      | "dinheiro"
      | "outro";
    const anexos = formData.getAll("anexos").filter((v): v is File => v instanceof File);
    return enviarPagamentoParcial(id, { valor, formaPagamento }, anexos);
  });
}
