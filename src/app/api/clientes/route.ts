import type { NextRequest } from "next/server";
import { buscarClientePorUsuarioId, criarCliente, listarClientes } from "@/lib/server/clientes.service";
import { handleRoute, podeAcessarUsuario, PERFIS_STAFF } from "@/lib/server/route-helpers";

// O envio do convite por WhatsApp pode levar mais que o padrão de 10s da Vercel.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const usuarioId = request.nextUrl.searchParams.get("usuarioId");
  // Sem `usuarioId`, a rota lista TODOS os clientes (nome, CPF, endereço, dados bancários) —
  // só a equipe interna (páginas de admin) usa essa variante. Com `usuarioId`, só a própria
  // pessoa (ou a equipe) pode buscar — senão qualquer cliente autenticado leria o CPF/endereço/
  // dados bancários de QUALQUER outro cliente só trocando o id na URL.
  return handleRoute(async (sessao) => {
    if (!usuarioId) return listarClientes();
    if (!podeAcessarUsuario(sessao, usuarioId)) throw new Error("Sem permissão para acessar este recurso.");
    return buscarClientePorUsuarioId(usuarioId);
  }, 200, usuarioId ? undefined : PERFIS_STAFF);
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
  }, 201, PERFIS_STAFF);
}
