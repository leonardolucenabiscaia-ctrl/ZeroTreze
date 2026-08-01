import "server-only";
import { addMonths } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/formatters";
import { criarNotificacao } from "./notificacoes.service";
import { mapAcordo } from "./mappers";
import type { Acordo } from "@/lib/types";

async function anexarCronograma(
  supabase: ReturnType<typeof createAdminClient>,
  acordos: Record<string, unknown>[]
): Promise<Acordo[]> {
  if (acordos.length === 0) return [];
  const ids = acordos.map((a) => a.id as string);
  const { data: parcelas } = await supabase.from("parcelas_acordo").select("*").in("acordo_id", ids);
  return acordos.map((a) => mapAcordo(a, (parcelas ?? []).filter((p) => p.acordo_id === a.id)));
}

export async function listarAcordos(): Promise<Acordo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("acordos").select("*").order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return anexarCronograma(supabase, data ?? []);
}

export async function listarAcordosPorCliente(clienteId: string): Promise<Acordo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("acordos").select("*").eq("cliente_id", clienteId);
  if (error) throw new Error(error.message);
  return anexarCronograma(supabase, data ?? []);
}

export async function buscarAcordoPorId(id: string): Promise<Acordo | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("acordos").select("*").eq("id", id).maybeSingle();
  if (!data) return undefined;
  const [acordo] = await anexarCronograma(supabase, [data]);
  return acordo;
}

export interface NovoAcordoInput {
  clienteId: string;
  contratoId: string;
  valorEntrada: number;
  valorParcela: number;
  quantidadeParcelas: number;
  dataPrimeiraParcela: string;
  descricao?: string;
  anexos: File[];
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
      situacao: "ativo",
      descricao: dados.descricao?.trim() || null,
      criado_em: agora,
    })
    .select()
    .single();
  if (error || !acordoRow) throw new Error(error?.message ?? "Não foi possível criar o acordo.");

  const cronograma = Array.from({ length: dados.quantidadeParcelas }, (_, i) => ({
    acordo_id: acordoRow.id,
    numero: i + 1,
    valor: dados.valorParcela,
    vencimento: addMonths(new Date(dados.dataPrimeiraParcela), i).toISOString(),
    pago: false,
  }));
  const { error: cronogramaError } = await supabase.from("parcelas_acordo").insert(cronograma);
  if (cronogramaError) throw new Error(cronogramaError.message);

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

  const [acordo] = await anexarCronograma(supabase, [acordoRow]);
  return acordo;
}
