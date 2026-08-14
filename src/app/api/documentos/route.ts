import type { NextRequest } from "next/server";
import { listarDocumentos, listarDocumentosPorCliente, listarDocumentosPorVeiculo } from "@/lib/server/documentos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";
import type { CategoriaDocumento } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clienteId = params.get("clienteId");
  const veiculoId = params.get("veiculoId");
  const categoria = params.get("categoria") as CategoriaDocumento | null;
  // Só o portal do cliente filtra por `clienteId` (documentos do próprio cliente); as outras
  // variantes (por veículo, ou a lista completa) são exclusivas do backoffice.
  return handleRoute(
    async () => {
      if (clienteId) return listarDocumentosPorCliente(clienteId, categoria ?? undefined);
      if (veiculoId) return listarDocumentosPorVeiculo(veiculoId);
      return listarDocumentos();
    },
    200,
    clienteId ? undefined : PERFIS_STAFF
  );
}
