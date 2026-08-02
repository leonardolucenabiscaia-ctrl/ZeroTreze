import { NextResponse } from "next/server";
import { gerarPdfContrato } from "@/lib/server/pdf/contrato-pdf";
import { enviarDocumentoParaAssinatura } from "@/lib/server/assinadoc.service";
import type { Cliente, Contrato, Veiculo } from "@/lib/types";

/** Rota temporária de diagnóstico — remover assim que a integração com a AssinaDoc estiver
 * confirmada funcionando em produção. */
export async function GET() {
  const contrato: Contrato = {
    id: "debug",
    numero: "CT-DEBUG-002",
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
    nome: "Cliente de Diagnóstico 2",
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
    placa: "DBG2A23",
    renavam: "12345678900",
    chassi: "9BWZZZ377VT000002",
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
    passos.tokenPresente = process.env.ASSINADOC_API_TOKEN ? "sim" : "NÃO — variável ausente";

    const pdfBuffer = await gerarPdfContrato({ contrato, cliente, veiculo });
    passos.pdfGerado = `sim, ${pdfBuffer.length} bytes`;

    const resultado = await enviarDocumentoParaAssinatura({
      nomeArquivo: "Diagnóstico Zero Treze 2",
      pdfBuffer,
      emailSignatario: "leonardolucenabiscaia@gmail.com",
      mensagem: "Segundo teste de diagnóstico da integração AssinaDoc (verificando instabilidade).",
    });
    passos.envioAssinadoc = `sucesso: ${JSON.stringify(resultado)}`;

    return NextResponse.json({ ok: true, passos });
  } catch (error) {
    passos.erro = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return NextResponse.json({ ok: false, passos }, { status: 500 });
  }
}
