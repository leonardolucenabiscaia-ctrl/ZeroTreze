import type { NextRequest } from "next/server";
import { listarComprovantesPorPagamentoParcialMulta } from "@/lib/server/pagamentos-parciais-multa.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// Usada só pela tela de revisão do financeiro (admin) — nenhum fluxo do cliente lê o comprovante
// de volta por essa rota.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(() => listarComprovantesPorPagamentoParcialMulta(id), 200, PERFIS_STAFF);
}
