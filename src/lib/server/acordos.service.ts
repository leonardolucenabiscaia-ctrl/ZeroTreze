import "server-only";
import { addMonths, addWeeks } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, dataDeHojeBrasil } from "@/lib/utils/formatters";
import { criarNotificacao, enviarWhatsAppNotificacao } from "./notificacoes.service";
import { mapAcordo, mapCliente, mapContrato, mapVeiculo } from "./mappers";
import { paginarTodasAsLinhas } from "./pagination";
import { gerarPdfAcordo } from "./pdf/acordo-pdf";
import { enviarDocumentoParaAssinatura } from "./clicksign.service";
import type { Acordo } from "@/lib/types";

/** Nenhuma parcela de acordo pode continuar "em_aberto" depois que o vencimento já passou — como
 * não há job de servidor rodando o tempo todo, corrige isso aqui, sempre que acordos são
 * consultados (mesmo padrão usado pelas parcelas de contrato). Diferente das parcelas de
 * contrato, aqui não precisa "liberar a próxima" — o cronograma inteiro já é gerado de uma vez na
 * criação do acordo. */
async function sincronizarParcelasAcordoVencidas(supabase: ReturnType<typeof createAdminClient>) {
  // Compara contra a data de HOJE em Brasília, também como data pura (sem hora) — nunca contra um
  // timestamp, que faria o Postgres converter "vencimento" pra meia-noite EM UTC antes de
  // comparar, virando "vencido" até um dia inteiro mais cedo (a Vercel roda em UTC, 3h à frente
  // do horário de Brasília).
  const hojeBrasilia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  await supabase
    .from("parcelas_acordo")
    .update({ status: "vencido" })
    .eq("status", "em_aberto")
    .lt("vencimento", hojeBrasilia);
}

async function anexarCronograma(
  supabase: ReturnType<typeof createAdminClient>,
  acordos: Record<string, unknown>[]
): Promise<Acordo[]> {
  if (acordos.length === 0) return [];
  const ids = acordos.map((a) => a.id as string);
  const parcelas = await paginarTodasAsLinhas((inicio, fim) =>
    supabase.from("parcelas_acordo").select("*").in("acordo_id", ids).range(inicio, fim)
  );
  return acordos.map((a) => mapAcordo(a, parcelas.filter((p) => p.acordo_id === a.id)));
}

export async function listarAcordos(): Promise<Acordo[]> {
  const supabase = createAdminClient();
  await sincronizarParcelasAcordoVencidas(supabase);
  const { data, error } = await supabase.from("acordos").select("*").order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return anexarCronograma(supabase, data ?? []);
}

export async function listarAcordosPorCliente(clienteId: string): Promise<Acordo[]> {
  const supabase = createAdminClient();
  await sincronizarParcelasAcordoVencidas(supabase);
  const { data, error } = await supabase.from("acordos").select("*").eq("cliente_id", clienteId);
  if (error) throw new Error(error.message);
  return anexarCronograma(supabase, data ?? []);
}

export async function buscarAcordoPorId(id: string): Promise<Acordo | undefined> {
  const supabase = createAdminClient();
  await sincronizarParcelasAcordoVencidas(supabase);
  const { data } = await supabase.from("acordos").select("*").eq("id", id).maybeSingle();
  if (!data) return undefined;
  const [acordo] = await anexarCronograma(supabase, [data]);
  return acordo;
}

/** Só `descricao` e `situacao` são editáveis diretamente — de propósito fora da whitelist:
 * `valorTotal`/`valorEntrada`/`periodicidade` (a forma financeira já foi derivada na criação e o
 * cronograma em `parcelas_acordo` já soma exatamente `valorTotal`; editar aqui sem regenerar o
 * cronograma desincronizaria os dois) e `clienteId`/`contratoId` (trocar a FK desalinharia o
 * vínculo com o contrato original que gerou a negociação). */
export async function atualizarAcordo(id: string, dados: Partial<Acordo>): Promise<Acordo> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (dados.descricao !== undefined) patch.descricao = dados.descricao || null;
  if (dados.situacao !== undefined) patch.situacao = dados.situacao;

  const { data, error } = await supabase.from("acordos").update(patch).eq("id", id).select().single();
  if (error || !data) throw new Error("Acordo não encontrado");
  const [acordo] = await anexarCronograma(supabase, [data]);
  return acordo;
}

/** Encerramento manual, feito pelo administrador — diferente de "quitado" (que já acontece
 * sozinho quando o saldo chega a zero, ver `confirmarPagamentoParcialAcordo`) e de "rompido" (uso
 * já existente). Mesma ideia de `encerrarContrato`: parcelas futuras ainda em aberto deixam de
 * fazer sentido (a vencida/já vencida fica registrada como histórico de inadimplência). */
export async function encerrarAcordo(acordoId: string): Promise<Acordo> {
  const supabase = createAdminClient();
  const { data: acordo } = await supabase.from("acordos").select("*").eq("id", acordoId).maybeSingle();
  if (!acordo) throw new Error("Acordo não encontrado");
  if (acordo.situacao !== "ativo") {
    throw new Error("Só é possível encerrar acordos ativos.");
  }

  const { data: atualizado, error } = await supabase
    .from("acordos")
    .update({ situacao: "encerrado" })
    .eq("id", acordoId)
    .select()
    .single();
  if (error || !atualizado) throw new Error(error?.message ?? "Não foi possível encerrar o acordo.");

  await supabase
    .from("parcelas_acordo")
    .delete()
    .eq("acordo_id", acordoId)
    .eq("status", "em_aberto")
    .gt("vencimento", dataDeHojeBrasil());

  const [acordoMapeado] = await anexarCronograma(supabase, [atualizado]);
  return acordoMapeado;
}

/** Apaga um acordo inteiro — mesmo esquema de `excluirContrato`: só pensado pra acordos criados
 * errados, nunca pra "limpar" um que já teve pagamento de verdade. Só aceita acordo já encerrado,
 * e recusa se houver qualquer parcela paga (ou com valor parcial já confirmado). Passando na
 * guarda, o delete em `acordos` já é suficiente — `parcelas_acordo`, `pagamentos_parciais_acordo`
 * e `documentos.acordo_id/parcela_acordo_id/pagamento_parcial_acordo_id` cascadeiam pela FK. */
export async function excluirAcordo(acordoId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: acordo } = await supabase.from("acordos").select("*").eq("id", acordoId).maybeSingle();
  if (!acordo) throw new Error("Acordo não encontrado");
  if (acordo.situacao !== "encerrado") {
    throw new Error("Só é possível excluir acordos já encerrados.");
  }

  const { count: parcelasPagas } = await supabase
    .from("parcelas_acordo")
    .select("id", { count: "exact", head: true })
    .eq("acordo_id", acordoId)
    .or("status.eq.pago,valor_pago.gt.0");
  if (parcelasPagas && parcelasPagas > 0) {
    throw new Error(
      "Este acordo tem parcelas pagas — há atividade financeira real registrada, então não pode ser excluído."
    );
  }

  if (acordo.arquivo_url && !String(acordo.arquivo_url).startsWith("/mock/")) {
    try {
      const caminho = String(acordo.arquivo_url).split("/contratos-assinados/")[1]?.split("?")[0];
      if (caminho) await supabase.storage.from("contratos-assinados").remove([caminho]);
    } catch (error) {
      console.error("[acordos] Falha ao apagar o PDF assinado do Storage:", error);
    }
  }

  const { error } = await supabase.from("acordos").delete().eq("id", acordoId);
  if (error) throw new Error(error.message);
}

export interface NovoAcordoInput {
  clienteId: string;
  contratoId: string;
  valorEntrada: number;
  valorParcela: number;
  quantidadeParcelas: number;
  dataInicio: string;
  dataPrimeiraParcela: string;
  valorDividaOriginal?: number;
  periodicidade: "semanal" | "mensal";
  descricao?: string;
  anexos: File[];
  /** Parcelas do contrato (em_aberto ou vencidas) que estão sendo quitadas por este acordo —
   * saem do Financeiro normal e passam para o status "renegociado". */
  parcelaIds?: string[];
}

export async function criarAcordo(dados: NovoAcordoInput): Promise<Acordo> {
  const supabase = createAdminClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("usuario_id")
    .eq("id", dados.clienteId)
    .maybeSingle();
  if (!cliente) throw new Error("Cliente não encontrado");
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id")
    .eq("id", dados.contratoId)
    .maybeSingle();
  if (!contrato) throw new Error("Contrato não encontrado");

  const { count } = await supabase.from("acordos").select("id", { count: "exact", head: true });
  const numero = `AC-${String((count ?? 0) + 1).padStart(6, "0")}`;
  const valorTotal = dados.valorEntrada + dados.valorParcela * dados.quantidadeParcelas;
  const agora = new Date().toISOString();

  const { data: acordoRow, error } = await supabase
    .from("acordos")
    .insert({
      numero,
      cliente_id: dados.clienteId,
      contrato_id: dados.contratoId,
      valor_total: valorTotal,
      valor_entrada: dados.valorEntrada,
      valor_divida_original: dados.valorDividaOriginal ?? null,
      periodicidade: dados.periodicidade,
      situacao: "ativo",
      descricao: dados.descricao?.trim() || null,
      data_inicio: dados.dataInicio,
      criado_em: agora,
    })
    .select()
    .single();
  if (error || !acordoRow) throw new Error(error?.message ?? "Não foi possível criar o acordo.");

  const avancarData = dados.periodicidade === "semanal" ? addWeeks : addMonths;
  const cronograma = Array.from({ length: dados.quantidadeParcelas }, (_, i) => ({
    acordo_id: acordoRow.id,
    numero: i + 1,
    valor: dados.valorParcela,
    vencimento: avancarData(new Date(dados.dataPrimeiraParcela), i).toISOString(),
    status: "em_aberto",
  }));
  const { error: cronogramaError } = await supabase.from("parcelas_acordo").insert(cronograma);
  if (cronogramaError) throw new Error(cronogramaError.message);

  if (dados.parcelaIds && dados.parcelaIds.length > 0) {
    const { error: renegociacaoError } = await supabase
      .from("parcelas")
      .update({ status: "renegociado", acordo_id: acordoRow.id })
      .eq("contrato_id", dados.contratoId)
      .in("status", ["em_aberto", "vencido"])
      .in("id", dados.parcelaIds);
    if (renegociacaoError) throw new Error(renegociacaoError.message);
  }

  if (dados.anexos.length > 0) {
    await supabase.from("documentos").insert(
      dados.anexos.map((arquivo) => ({
        cliente_id: dados.clienteId,
        contrato_id: dados.contratoId,
        acordo_id: acordoRow.id,
        categoria: "acordo",
        nome: arquivo.name,
        url: "#",
        tamanho_kb: Math.max(1, Math.round(arquivo.size / 1024)),
        criado_em: agora,
      }))
    );
  }

  await criarNotificacao({
    id: crypto.randomUUID(),
    usuarioId: cliente.usuario_id,
    tipo: "acordo_criado",
    titulo: "Novo acordo disponível",
    mensagem: `Foi criado o acordo ${numero}, no valor total de ${formatCurrency(valorTotal)}. Confira as condições.`,
    lida: false,
    criadoEm: new Date().toISOString(),
    link: "/acordos",
  });
  await enviarWhatsAppNotificacao(cliente.usuario_id, "WHATSAPP_TEMPLATE_ACORDO_CRIADO", [
    numero,
    formatCurrency(valorTotal),
  ]);

  const acordoAtualizado = await enviarAcordoParaAssinaturaSeConfigurado(supabase, acordoRow);

  const [acordo] = await anexarCronograma(supabase, [acordoAtualizado]);
  return acordo;
}

/** Best-effort: se a ClickSign estiver fora do ar, sem credenciais configuradas, ou o cliente não
 * tiver e-mail, o acordo continua criado normalmente — só não fica com `assinatura` preenchida, e
 * o erro fica registrado no log do servidor. Usada na criação do acordo, onde uma falha no envio
 * não pode travar o resto do fluxo. */
async function enviarAcordoParaAssinaturaSeConfigurado(
  supabase: ReturnType<typeof createAdminClient>,
  acordoRow: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    return await enviarAcordoParaAssinaturaInterno(supabase, acordoRow);
  } catch (error) {
    console.error(
      `[clicksign] Falha ao enviar acordo ${acordoRow.id} para assinatura:`,
      error instanceof Error ? error.message : error
    );
    return acordoRow;
  }
}

/** Reenvia manualmente um acordo já existente pra assinatura eletrônica — pra acordos criados
 * antes dessa integração existir, ou quando o envio automático falhou (ex.: cliente sem e-mail na
 * hora, corrigido depois). Diferente do envio automático na criação, aqui o erro é repassado pra
 * quem chamou poder mostrar pro administrador o que deu errado. */
export async function reenviarAcordoParaAssinatura(acordoId: string): Promise<Acordo> {
  const supabase = createAdminClient();
  const { data: acordoRow } = await supabase.from("acordos").select("*").eq("id", acordoId).maybeSingle();
  if (!acordoRow) throw new Error("Acordo não encontrado.");

  const atualizado = await enviarAcordoParaAssinaturaInterno(supabase, acordoRow);
  const [acordo] = await anexarCronograma(supabase, [atualizado]);
  return acordo;
}

/**
 * Gera o PDF do acordo e envia pra assinatura eletrônica na ClickSign — mesmo fluxo já usado pra
 * contrato (ver `enviarContratoParaAssinaturaSeConfigurado` em `contratos.service.ts`).
 */
async function enviarAcordoParaAssinaturaInterno(
  supabase: ReturnType<typeof createAdminClient>,
  acordoRow: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data: clienteRow } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", acordoRow.cliente_id)
    .single();
  if (!clienteRow) throw new Error("Cliente não encontrado.");

  const { data: contratoRow } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", acordoRow.contrato_id)
    .single();
  if (!contratoRow) throw new Error("Contrato não encontrado.");

  const { data: veiculoRow } = await supabase
    .from("veiculos")
    .select("*")
    .eq("id", contratoRow.veiculo_id)
    .single();
  if (!veiculoRow) throw new Error("Veículo não encontrado.");

  const { data: usuarioRow } = await supabase
    .from("usuarios")
    .select("email")
    .eq("id", clienteRow.usuario_id)
    .single();
  if (!usuarioRow?.email || usuarioRow.email.endsWith("@zerotrezetransportes.pendente")) {
    throw new Error("Cliente sem e-mail cadastrado — complete o cadastro antes de enviar pra assinatura.");
  }

  const [acordoSemCronograma] = await anexarCronograma(supabase, [acordoRow]);
  const cliente = mapCliente(clienteRow);
  const contrato = mapContrato(contratoRow, []);
  const veiculo = mapVeiculo(veiculoRow, []);

  const pdfBuffer = await gerarPdfAcordo({ acordo: acordoSemCronograma, contrato, cliente, veiculo });
  const resultado = await enviarDocumentoParaAssinatura({
    nomeArquivo: `Acordo ${acordoSemCronograma.numero} - ${cliente.nome}`,
    pdfBuffer,
    emailSignatario: usuarioRow.email,
    nomeSignatario: cliente.nome,
    mensagem: `Olá, ${cliente.nome}! Segue o acordo ${acordoSemCronograma.numero} da Zero Treze Transportes para assinatura eletrônica.`,
  });

  const agora = new Date().toISOString();
  const { data: atualizado } = await supabase
    .from("acordos")
    .update({
      assinatura_document_key: resultado.documentId,
      assinatura_envelope_id: resultado.envelopeId,
      assinatura_status: resultado.status,
      assinatura_enviado_em: agora,
      assinatura_atualizado_em: agora,
    })
    .eq("id", acordoRow.id)
    .select()
    .single();

  return atualizado ?? acordoRow;
}
