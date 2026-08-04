import type { NextRequest } from "next/server";
import { buscarClientePorUsuarioId, criarCliente, listarClientes } from "@/lib/server/clientes.service";
import { handleRoute } from "@/lib/server/route-helpers";

// O envio do convite por e-mail (SMTP) pode levar mais que o padrão de 10s da Vercel.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const usuarioId = request.nextUrl.searchParams.get("usuarioId");
  return handleRoute(async () =>
    usuarioId ? await buscarClientePorUsuarioId(usuarioId) : await listarClientes()
  );
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const formData = await request.formData();
    const anexos = formData.getAll("anexos").filter((v): v is File => v instanceof File);
    const dados = {
      nomeCompleto: String(formData.get("nomeCompleto") ?? ""),
      email: String(formData.get("email") ?? ""),
      cpf: String(formData.get("cpf") ?? ""),
      rg: String(formData.get("rg") ?? ""),
      nacionalidade: String(formData.get("nacionalidade") ?? ""),
      profissao: String(formData.get("profissao") ?? ""),
      telefone: String(formData.get("telefone") ?? ""),
      dataNascimento: String(formData.get("dataNascimento") ?? ""),
      cnhNumero: String(formData.get("cnhNumero") ?? ""),
      cnhValidade: String(formData.get("cnhValidade") ?? ""),
      cep: String(formData.get("cep") ?? ""),
      endereco: String(formData.get("endereco") ?? ""),
      numero: String(formData.get("numero") ?? ""),
      complemento: formData.get("complemento") ? String(formData.get("complemento")) : undefined,
      bairro: String(formData.get("bairro") ?? ""),
      cidade: String(formData.get("cidade") ?? ""),
      uf: String(formData.get("uf") ?? ""),
      anexos,
    };
    return criarCliente(dados);
  }, 201);
}
