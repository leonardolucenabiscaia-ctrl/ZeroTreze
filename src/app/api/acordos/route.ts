import type { NextRequest } from "next/server";
import { criarAcordo, listarAcordos, listarAcordosPorCliente } from "@/lib/server/acordos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const clienteId = request.nextUrl.searchParams.get("clienteId");
  return handleRoute(
    async () => (clienteId ? await listarAcordosPorCliente(clienteId) : await listarAcordos()),
    200,
    clienteId ? undefined : PERFIS_STAFF
  );
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const formData = await request.formData();
    const anexos = formData.getAll("anexos").filter((v): v is File => v instanceof File);
    const dados = {
      clienteId: String(formData.get("clienteId") ?? ""),
      contratoId: String(formData.get("contratoId") ?? ""),
      valorEntrada: Number(formData.get("valorEntrada") ?? 0),
      valorParcela: Number(formData.get("valorParcela") ?? 0),
      quantidadeParcelas: Number(formData.get("quantidadeParcelas") ?? 0),
      dataPrimeiraParcela: String(formData.get("dataPrimeiraParcela") ?? ""),
      valorDividaOriginal: formData.get("valorDividaOriginal")
        ? Number(formData.get("valorDividaOriginal"))
        : undefined,
      periodicidade: (String(formData.get("periodicidade") ?? "mensal")) as "semanal" | "mensal",
      descricao: formData.get("descricao") ? String(formData.get("descricao")) : undefined,
      parcelaIds: formData.get("parcelaIds")
        ? (JSON.parse(String(formData.get("parcelaIds"))) as string[])
        : undefined,
      anexos,
    };
    return criarAcordo(dados);
  }, 201, PERFIS_STAFF);
}
