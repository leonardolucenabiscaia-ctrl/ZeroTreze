import { NextResponse, type NextRequest } from "next/server";
import { buscarContratoPorId } from "@/lib/server/contratos.service";
import { buscarClientePorId } from "@/lib/server/clientes.service";
import { buscarVeiculoPorId } from "@/lib/server/veiculos.service";
import { gerarPdfContrato } from "@/lib/server/pdf/contrato-pdf";
import { handleRoute, podeAcessarContrato } from "@/lib/server/route-helpers";

// Gera o PDF de verdade (mesmo gerador usado no envio pra assinatura eletrônica) pra imprimir/
// visualizar — troca a antiga página HTML de impressão, que saía com o tema escuro do site (duas
// barras pretas) quando impressa direto do navegador.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async (sessao) => {
    if (!(await podeAcessarContrato(sessao, id))) throw new Error("Sem permissão para acessar este recurso.");

    const contrato = await buscarContratoPorId(id);
    if (!contrato) throw new Error("Contrato não encontrado.");
    const [cliente, veiculo] = await Promise.all([
      buscarClientePorId(contrato.clienteId),
      buscarVeiculoPorId(contrato.veiculoId),
    ]);
    if (!cliente || !veiculo) throw new Error("Não foi possível montar os dados do contrato.");

    const pdfBuffer = await gerarPdfContrato({ contrato, cliente, veiculo });
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Contrato ${contrato.numero}.pdf"`,
      },
    });
  });
}
