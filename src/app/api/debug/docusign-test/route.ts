import { NextResponse } from "next/server";
import { gerarPdfContrato } from "@/lib/server/pdf/contrato-pdf";
import { enviarDocumentoParaAssinatura } from "@/lib/server/docusign.service";
import type { Cliente, Contrato, Veiculo } from "@/lib/types";

/** Rota temporária de diagnóstico — remover assim que a integração com a DocuSign estiver
 * confirmada funcionando em produção. */
export async function GET() {
  const contrato: Contrato = {
    id: "debug",
    numero: "CT-DEBUG-DS",
    clienteId: "debug",
    veiculoId: "debug",
    status: "em_dia",
    dataInicio: new Date().toISOString(),
    dataFim: new Date().toISOString(),
    valorParcela: 800,
    valorCaucao: 1500,
    limiteRenovacao: 9600,
    arquivoUrl: "",
    aditivos: [],
  };
  const cliente: Cliente = {
    id: "debug",
    usuarioId: "debug",
    nome: "Cliente de Diagnóstico DocuSign",
    tipoDocumento: "cpf",
    documento: "39053344705",
    rg: "123456789",
    nacionalidade: "Brasileira",
    profissao: "Motorista",
    dataNascimento: "1990-05-15",
    cnh: { numero: "12345678900", validade: "2030-01-01" },
    endereco: {
      logradouro: "Praça da Sé",
      numero: "100",
      bairro: "Sé",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01001000",
    },
    dadosBancarios: { banco: "", agencia: "", conta: "", chavePix: "" },
    clienteDesde: new Date().toISOString(),
  };
  const veiculo: Veiculo = {
    id: "debug",
    modelo: "Corolla",
    marca: "Toyota",
    ano: 2023,
    cor: "Prata",
    placa: "DBG3A23",
    renavam: "12345678900",
    chassi: "9BWZZZ377VT000003",
    categoria: "Sedan",
    combustivel: "Flex",
    quilometragem: 0,
    fotoUrl: "",
    proximaRevisao: new Date().toISOString(),
    ultimaRevisao: new Date().toISOString(),
    seguradora: "",
    numeroApolice: "",
    assistencia247: true,
    garantiaAte: new Date().toISOString(),
    bloqueado: false,
    historicoManutencao: [],
  };

  const passos: Record<string, string> = {};

  try {
    passos.integrationKeyPresente = process.env.DOCUSIGN_INTEGRATION_KEY ? "sim" : "NÃO";
    passos.userIdPresente = process.env.DOCUSIGN_USER_ID ? "sim" : "NÃO";
    passos.accountIdPresente = process.env.DOCUSIGN_ACCOUNT_ID ? "sim" : "NÃO";
    passos.baseUriPresente = process.env.DOCUSIGN_BASE_URI ? "sim" : "NÃO";
    passos.authServerPresente = process.env.DOCUSIGN_AUTH_SERVER ? "sim" : "NÃO";
    const chave = process.env.DOCUSIGN_PRIVATE_KEY;
    passos.privateKeyPresente = chave ? `sim, ${chave.length} caracteres` : "NÃO";
    passos.privateKeyComeca = chave ? chave.slice(0, 40) : "";
    passos.privateKeyTermina = chave ? chave.slice(-40) : "";

    const pdfBuffer = await gerarPdfContrato({ contrato, cliente, veiculo });
    passos.pdfGerado = `sim, ${pdfBuffer.length} bytes`;

    const resultado = await enviarDocumentoParaAssinatura({
      nomeArquivo: "Diagnóstico DocuSign",
      pdfBuffer,
      emailSignatario: "leonardolucenabiscaia@gmail.com",
      nomeSignatario: "Leonardo Diagnóstico",
      mensagem: "Teste de diagnóstico da integração DocuSign.",
    });
    passos.envioDocusign = `sucesso: ${JSON.stringify(resultado)}`;

    return NextResponse.json({ ok: true, passos });
  } catch (error) {
    passos.erro = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return NextResponse.json({ ok: false, passos }, { status: 500 });
  }
}
