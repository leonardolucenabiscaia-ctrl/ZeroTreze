import "server-only";
import { addMonths } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { gerarParcelas, gerarExtrato } from "@/lib/mock-data/generators/financeiro";
import { formatarNumeroContrato } from "@/lib/mock-data/generators/contrato";
import { gerarPdfContrato } from "./pdf/contrato-pdf";
import { enviarDocumentoParaAssinatura } from "./docusign.service";
import { mapCliente, mapContrato, mapVeiculo } from "./mappers";
import type { Contrato } from "@/lib/types";

const PRAZO_MINIMO_MESES = 6;

async function anexarAditivos(
  supabase: ReturnType<typeof createAdminClient>,
  contratos: Record<string, unknown>[]
): Promise<Contrato[]> {
  if (contratos.length === 0) return [];
  const ids = contratos.map((c) => c.id as string);
  const { data: aditivos } = await supabase.from("aditivos_contrato").select("*").in("contrato_id", ids);
  return contratos.map((c) =>
    mapContrato(
      c,
      (aditivos ?? []).filter((a) => a.contrato_id === c.id)
    )
  );
}

export async function listarContratos(): Promise<Contrato[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("contratos").select("*").order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return anexarAditivos(supabase, data ?? []);
}

export async function listarContratosPorCliente(clienteId: string): Promise<Contrato[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("contratos").select("*").eq("cliente_id", clienteId);
  if (error) throw new Error(error.message);
  return anexarAditivos(supabase, data ?? []);
}

export async function buscarContratoPorId(id: string): Promise<Contrato | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("contratos").select("*").eq("id", id).maybeSingle();
  if (!data) return undefined;
  const [contrato] = await anexarAditivos(supabase, [data]);
  return contrato;
}

export async function contratoAtivoPorCliente(clienteId: string): Promise<Contrato | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("contratos").select("*").eq("cliente_id", clienteId);
  const contratosCliente = data ?? [];
  const escolhido = contratosCliente.find((c) => c.status !== "encerrado") ?? contratosCliente[0];
  if (!escolhido) return undefined;
  const [contrato] = await anexarAditivos(supabase, [escolhido]);
  return contrato;
}

/** Um veículo só pode estar vinculado a um contrato ativo por vez (ver `criarContrato`). */
export async function contratoAtivoPorVeiculo(veiculoId: string): Promise<Contrato | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("contratos")
    .select("*")
    .eq("veiculo_id", veiculoId)
    .neq("status", "encerrado")
    .maybeSingle();
  if (!data) return undefined;
  const [contrato] = await anexarAditivos(supabase, [data]);
  return contrato;
}

export interface NovoContratoInput {
  clienteId: string;
  veiculoId: string;
  valorSemanal: number;
  dataInicio: string;
  caucao: number;
}

export async function criarContrato(dados: NovoContratoInput): Promise<Contrato> {
  const supabase = createAdminClient();

  const { data: ativoExistente } = await supabase
    .from("contratos")
    .select("id")
    .eq("veiculo_id", dados.veiculoId)
    .neq("status", "encerrado")
    .maybeSingle();
  if (ativoExistente) throw new Error("Esse veículo já está vinculado a um contrato ativo.");

  const dataInicio = new Date(dados.dataInicio);
  const dataFim = addMonths(dataInicio, PRAZO_MINIMO_MESES);
  const anoContrato = dataInicio.getFullYear();

  const { count } = await supabase
    .from("contratos")
    .select("id", { count: "exact", head: true })
    .gte("data_inicio", `${anoContrato}-01-01`)
    .lt("data_inicio", `${anoContrato + 1}-01-01`);
  const numero = formatarNumeroContrato(anoContrato, (count ?? 0) + 1);

  // Monta no formato do tipo `Contrato` (camelCase) só pra reaproveitar gerarParcelas/gerarExtrato
  // (a mesma lógica de geração de parcelas semanais já usada e testada nesta sessão).
  const contratoTmp: Contrato = {
    id: crypto.randomUUID(),
    numero,
    clienteId: dados.clienteId,
    veiculoId: dados.veiculoId,
    status: "em_dia",
    dataInicio: dataInicio.toISOString(),
    dataFim: dataFim.toISOString(),
    valorParcela: dados.valorSemanal,
    valorCaucao: dados.caucao,
    limiteRenovacao: dados.valorSemanal * 12,
    arquivoUrl: "/mock/documentos/contrato-principal.pdf",
    aditivos: [],
  };

  const { data: contratoRow, error } = await supabase
    .from("contratos")
    .insert({
      id: contratoTmp.id,
      numero: contratoTmp.numero,
      cliente_id: contratoTmp.clienteId,
      veiculo_id: contratoTmp.veiculoId,
      status: contratoTmp.status,
      data_inicio: contratoTmp.dataInicio,
      data_fim: contratoTmp.dataFim,
      valor_parcela: contratoTmp.valorParcela,
      valor_caucao: contratoTmp.valorCaucao,
      limite_renovacao: contratoTmp.limiteRenovacao,
      arquivo_url: contratoTmp.arquivoUrl,
    })
    .select()
    .single();
  if (error || !contratoRow) throw new Error(error?.message ?? "Não foi possível criar o contrato.");

  const parcelas = gerarParcelas(contratoTmp);
  const extrato = gerarExtrato(contratoTmp, parcelas);

  if (parcelas.length > 0) {
    const { error: parcelasError } = await supabase.from("parcelas").insert(
      parcelas.map((p) => ({
        id: p.id,
        contrato_id: contratoRow.id,
        numero: p.numero,
        competencia: p.competencia,
        valor_original: p.valorOriginal,
        data_vencimento: p.dataVencimento,
        data_pagamento: p.dataPagamento ?? null,
        status: p.status,
        forma_pagamento: p.formaPagamento ?? null,
      }))
    );
    if (parcelasError) throw new Error(parcelasError.message);
  }

  if (extrato.length > 0) {
    const { error: extratoError } = await supabase.from("movimentos_extrato").insert(
      extrato.map((m) => ({
        id: m.id,
        contrato_id: contratoRow.id,
        descricao: m.descricao,
        data: m.data,
        tipo: m.tipo,
        valor: m.valor,
        saldo: m.saldo,
      }))
    );
    if (extratoError) throw new Error(extratoError.message);
  }

  const contratoAtualizado = await enviarContratoParaAssinaturaSeConfigurado(supabase, contratoRow);

  return mapContrato(contratoAtualizado, []);
}

/**
 * Gera o PDF do contrato e envia para assinatura eletrônica na DocuSign, assim que o contrato é
 * criado. É best-effort: se a DocuSign estiver fora do ar, sem credenciais configuradas, ou o
 * cliente não tiver e-mail, o contrato continua criado normalmente — só não fica com `assinatura`
 * preenchido, e o erro fica registrado no log do servidor.
 *
 * `assinatura_document_key` guarda o `envelopeId` da DocuSign (identificador canônico do envio) —
 * `assinatura_request_id`/`assinatura_signing_key` não têm equivalente direto no modelo da
 * DocuSign e ficam null.
 */
async function enviarContratoParaAssinaturaSeConfigurado(
  supabase: ReturnType<typeof createAdminClient>,
  contratoRow: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const [{ data: clienteRow }, { data: veiculoRow }] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", contratoRow.cliente_id).single(),
      supabase.from("veiculos").select("*").eq("id", contratoRow.veiculo_id).single(),
    ]);
    if (!clienteRow || !veiculoRow) throw new Error("Cliente ou veículo não encontrado.");

    const { data: usuarioRow } = await supabase
      .from("usuarios")
      .select("email")
      .eq("id", clienteRow.usuario_id)
      .single();
    if (!usuarioRow?.email) throw new Error("Cliente sem e-mail cadastrado.");

    const contrato = mapContrato(contratoRow, []);
    const cliente = mapCliente(clienteRow);
    const veiculo = mapVeiculo(veiculoRow, []);

    const pdfBuffer = await gerarPdfContrato({ contrato, cliente, veiculo });
    const resultado = await enviarDocumentoParaAssinatura({
      nomeArquivo: `Contrato ${contrato.numero} - ${cliente.nome}`,
      pdfBuffer,
      emailSignatario: usuarioRow.email,
      nomeSignatario: cliente.nome,
      mensagem: `Olá, ${cliente.nome}! Segue o contrato de locação ${contrato.numero} da Zero Treze Transportes para assinatura eletrônica.`,
    });

    const agora = new Date().toISOString();
    const { data: atualizado } = await supabase
      .from("contratos")
      .update({
        assinatura_document_key: resultado.envelopeId,
        assinatura_status: resultado.status,
        assinatura_enviado_em: agora,
        assinatura_atualizado_em: agora,
      })
      .eq("id", contratoRow.id)
      .select()
      .single();

    return atualizado ?? contratoRow;
  } catch (error) {
    console.error(
      `[docusign] Falha ao enviar contrato ${contratoRow.id} para assinatura:`,
      error instanceof Error ? error.message : error
    );
    return contratoRow;
  }
}

export async function encerrarContrato(contratoId: string): Promise<Contrato> {
  const supabase = createAdminClient();
  const { data: contrato } = await supabase.from("contratos").select("*").eq("id", contratoId).maybeSingle();
  if (!contrato) throw new Error("Contrato não encontrado");
  if (contrato.status === "encerrado") throw new Error("Este contrato já está encerrado");

  const agora = new Date().toISOString();
  const { data: atualizado, error } = await supabase
    .from("contratos")
    .update({ status: "encerrado", data_fim: agora })
    .eq("id", contratoId)
    .select()
    .single();
  if (error || !atualizado) throw new Error(error?.message ?? "Não foi possível encerrar o contrato.");

  // Parcelas futuras em aberto deixam de fazer sentido após o encerramento.
  await supabase
    .from("parcelas")
    .delete()
    .eq("contrato_id", contratoId)
    .eq("status", "em_aberto")
    .gt("data_vencimento", agora);

  const [contratoMapeado] = await anexarAditivos(supabase, [atualizado]);
  return contratoMapeado;
}
