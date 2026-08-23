import type { NextRequest } from "next/server";
import {
  criarVeiculo,
  listarVeiculos,
  listarVeiculosBloqueados,
  listarVeiculosEmManutencao,
} from "@/lib/server/veiculos.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// A frota inteira (com localização/estado de cada veículo) só é usada pelo backoffice — o
// portal do cliente não lista veículos, só enxerga o próprio via contrato.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const bloqueados = params.get("bloqueados") === "true";
  const emManutencao = params.get("emManutencao") === "true";
  return handleRoute(
    () => (emManutencao ? listarVeiculosEmManutencao() : bloqueados ? listarVeiculosBloqueados() : listarVeiculos()),
    200,
    PERFIS_STAFF
  );
}

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const formData = await request.formData();
    const anexos = formData.getAll("anexos").filter((v): v is File => v instanceof File);
    const foto = formData.get("foto");
    const dados = {
      marca: String(formData.get("marca") ?? ""),
      modelo: String(formData.get("modelo") ?? ""),
      ano: Number(formData.get("ano") ?? 0),
      placa: String(formData.get("placa") ?? ""),
      cor: String(formData.get("cor") ?? ""),
      renavam: String(formData.get("renavam") ?? ""),
      chassi: String(formData.get("chassi") ?? ""),
      categoria: String(formData.get("categoria") ?? ""),
      combustivel: String(formData.get("combustivel") ?? ""),
      quilometragem: Number(formData.get("quilometragem") ?? 0),
      anexos,
      foto: foto instanceof File ? foto : undefined,
    };
    return criarVeiculo(dados);
  }, 201, PERFIS_STAFF);
}
