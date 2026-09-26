import type { NextRequest } from "next/server";
import { enviarPagamentoParcialAcordo } from "@/lib/server/pagamentos-parciais-acordo.service";
import { handleRoute, podeAcessarParcelaAcordo } from "@/lib/server/route-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async (sessao) => {
    if (!(await podeAcessarParcelaAcordo(sessao, id))) throw new Error("Sem permissão para acessar este recurso.");
    const formData = await request.formData();
    const valor = Number(formData.get("valor"));
    const formaPagamento = String(formData.get("formaPagamento") ?? "pix") as
      | "pix"
      | "boleto"
      | "dinheiro"
      | "outro";
    const anexos = formData.getAll("anexos").filter((v): v is File => v instanceof File);
    return enviarPagamentoParcialAcordo(id, { valor, formaPagamento }, anexos);
  });
}
