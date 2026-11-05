import { NextResponse, type NextRequest } from "next/server";
import { buscarAcordoPorId } from "@/lib/server/acordos.service";
import { buscarContratoPorId } from "@/lib/server/contratos.service";
import { buscarClientePorId } from "@/lib/server/clientes.service";
import { buscarVeiculoPorId } from "@/lib/server/veiculos.service";
import { gerarPdfAcordo } from "@/lib/server/pdf/acordo-pdf";
import { handleRoute, podeAcessarCliente } from "@/lib/server/route-helpers";

// Mesma ideia de contratos/[id]/pdf — gera o PDF de verdade em vez de depender da página HTML de
// impressão (que saía com o tema escuro do site quando impressa direto do navegador).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(async (sessao) => {
    const acordo = await buscarAcordoPorId(id);
    if (!acordo) throw new Error("Acordo não encontrado.");
    if (!(await podeAcessarCliente(sessao, acordo.clienteId))) {
      throw new Error("Sem permissão para acessar este recurso.");
    }

    // Acordo de contrato antigo, não cadastrado no sistema — sem contrato/veículo pra buscar; o
    // PDF usa uma redação genérica nesse caso (ver acordo-pdf.tsx).
    const contrato = acordo.contratoId ? await buscarContratoPorId(acordo.contratoId) : undefined;
    if (acordo.contratoId && !contrato) throw new Error("Contrato vinculado não encontrado.");
    const [cliente, veiculo] = await Promise.all([
      buscarClientePorId(acordo.clienteId),
      contrato ? buscarVeiculoPorId(contrato.veiculoId) : Promise.resolve(undefined),
    ]);
    if (!cliente || (contrato && !veiculo)) throw new Error("Não foi possível montar os dados do acordo.");

    const pdfBuffer = await gerarPdfAcordo({ acordo, contrato, cliente, veiculo });
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Acordo ${acordo.numero}.pdf"`,
      },
    });
  });
}
