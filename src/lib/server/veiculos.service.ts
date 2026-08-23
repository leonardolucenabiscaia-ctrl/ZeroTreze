import "server-only";
import { addMonths, addYears } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { fotoDoVeiculo } from "@/lib/mock-data/generators/veiculo-foto";
import { mapVeiculo } from "./mappers";
import type { Veiculo } from "@/lib/types";

async function anexarHistorico(
  supabase: ReturnType<typeof createAdminClient>,
  veiculos: Record<string, unknown>[]
): Promise<Veiculo[]> {
  if (veiculos.length === 0) return [];
  const ids = veiculos.map((v) => v.id as string);
  const { data: historico } = await supabase.from("historico_manutencao").select("*").in("veiculo_id", ids);
  return veiculos.map((v) =>
    mapVeiculo(
      v,
      (historico ?? []).filter((h) => h.veiculo_id === v.id)
    )
  );
}

export async function listarVeiculos(): Promise<Veiculo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("veiculos").select("*").order("modelo");
  if (error) throw new Error(error.message);
  return anexarHistorico(supabase, data ?? []);
}

export async function buscarVeiculoPorId(id: string): Promise<Veiculo | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("veiculos").select("*").eq("id", id).maybeSingle();
  if (!data) return undefined;
  const [veiculo] = await anexarHistorico(supabase, [data]);
  return veiculo;
}

export async function listarVeiculosBloqueados(): Promise<Veiculo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("veiculos").select("*").eq("bloqueado", true);
  if (error) throw new Error(error.message);
  return anexarHistorico(supabase, data ?? []);
}

export async function bloquearVeiculo(veiculoId: string): Promise<Veiculo> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("veiculos")
    .update({ bloqueado: true, bloqueado_em: new Date().toISOString() })
    .eq("id", veiculoId)
    .select()
    .single();
  if (error || !data) throw new Error("Veículo não encontrado");
  const [veiculo] = await anexarHistorico(supabase, [data]);
  return veiculo;
}

export async function desbloquearVeiculo(veiculoId: string): Promise<Veiculo> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("veiculos")
    .update({ bloqueado: false, bloqueado_em: null })
    .eq("id", veiculoId)
    .select()
    .single();
  if (error || !data) throw new Error("Veículo não encontrado");
  const [veiculo] = await anexarHistorico(supabase, [data]);
  return veiculo;
}

export async function listarVeiculosEmManutencao(): Promise<Veiculo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("veiculos").select("*").not("manutencao_tipo", "is", null);
  if (error) throw new Error(error.message);
  return anexarHistorico(supabase, data ?? []);
}

export async function colocarVeiculoEmManutencao(
  veiculoId: string,
  tipo: "mecanica" | "funilaria"
): Promise<Veiculo> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("veiculos")
    .update({ manutencao_tipo: tipo, manutencao_desde: new Date().toISOString() })
    .eq("id", veiculoId)
    .select()
    .single();
  if (error || !data) throw new Error("Veículo não encontrado");
  const [veiculo] = await anexarHistorico(supabase, [data]);
  return veiculo;
}

export async function retirarVeiculoDeManutencao(veiculoId: string): Promise<Veiculo> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("veiculos")
    .update({ manutencao_tipo: null, manutencao_desde: null })
    .eq("id", veiculoId)
    .select()
    .single();
  if (error || !data) throw new Error("Veículo não encontrado");
  const [veiculo] = await anexarHistorico(supabase, [data]);
  return veiculo;
}

export interface NovoVeiculoInput {
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  cor: string;
  renavam: string;
  chassi: string;
  categoria: string;
  combustivel: string;
  quilometragem: number;
  anexos: File[];
  foto?: File;
}

const BUCKET_FOTOS_VEICULOS = "veiculos-fotos";

/** Sobe a foto de perfil enviada pelo admin para o Storage e devolve a URL pública — melhor
 * esforço: se falhar, o veículo continua com a foto padrão já atribuída (não bloqueia o
 * cadastro). */
async function enviarFotoVeiculo(
  supabase: ReturnType<typeof createAdminClient>,
  veiculoId: string,
  foto: File
): Promise<string | null> {
  try {
    const extensao = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${veiculoId}.${extensao}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_FOTOS_VEICULOS)
      .upload(caminho, await foto.arrayBuffer(), { contentType: foto.type, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from(BUCKET_FOTOS_VEICULOS).getPublicUrl(caminho);
    return `${data.publicUrl}?v=${Date.now()}`;
  } catch (error) {
    console.error("[veiculos] Falha ao enviar foto de perfil do veículo:", error);
    return null;
  }
}

export async function criarVeiculo(dados: NovoVeiculoInput): Promise<Veiculo> {
  const supabase = createAdminClient();

  const placaNormalizada = dados.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { data: existente } = await supabase
    .from("veiculos")
    .select("id")
    .eq("placa", placaNormalizada)
    .maybeSingle();
  if (existente) throw new Error("Já existe um veículo cadastrado com essa placa.");

  const agora = new Date();
  const { data: veiculoRow, error } = await supabase
    .from("veiculos")
    .insert({
      marca: dados.marca,
      modelo: dados.modelo,
      ano: dados.ano,
      cor: dados.cor,
      placa: placaNormalizada,
      renavam: dados.renavam,
      chassi: dados.chassi.toUpperCase(),
      categoria: dados.categoria,
      combustivel: dados.combustivel,
      quilometragem: dados.quilometragem,
      foto_url: fotoDoVeiculo(dados.marca, dados.modelo),
      ultima_revisao: agora.toISOString(),
      proxima_revisao: addMonths(agora, 6).toISOString(),
      seguradora: "",
      numero_apolice: "",
      assistencia_247: true,
      garantia_ate: addYears(agora, 1).toISOString(),
      bloqueado: false,
    })
    .select()
    .single();
  if (error || !veiculoRow) throw new Error(error?.message ?? "Não foi possível cadastrar o veículo.");

  if (dados.foto) {
    const urlFoto = await enviarFotoVeiculo(supabase, veiculoRow.id, dados.foto);
    if (urlFoto) {
      const { data: atualizado } = await supabase
        .from("veiculos")
        .update({ foto_url: urlFoto })
        .eq("id", veiculoRow.id)
        .select()
        .single();
      if (atualizado) Object.assign(veiculoRow, atualizado);
    }
  }

  if (dados.anexos.length > 0) {
    await supabase.from("documentos").insert(
      dados.anexos.map((arquivo) => ({
        veiculo_id: veiculoRow.id,
        categoria: "cadastro",
        nome: arquivo.name,
        url: "#",
        tamanho_kb: Math.max(1, Math.round(arquivo.size / 1024)),
        criado_em: agora.toISOString(),
      }))
    );
  }

  return mapVeiculo(veiculoRow, []);
}

export async function atualizarVeiculo(veiculoId: string, dados: Partial<Veiculo>): Promise<Veiculo> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (dados.cor !== undefined) patch.cor = dados.cor;
  if (dados.combustivel !== undefined) patch.combustivel = dados.combustivel;
  if (dados.categoria !== undefined) patch.categoria = dados.categoria;
  if (dados.seguradora !== undefined) patch.seguradora = dados.seguradora;
  if (dados.numeroApolice !== undefined) patch.numero_apolice = dados.numeroApolice;

  const { data, error } = await supabase.from("veiculos").update(patch).eq("id", veiculoId).select().single();
  if (error || !data) throw new Error("Veículo não encontrado");
  const [veiculo] = await anexarHistorico(supabase, [data]);
  return veiculo;
}

/** A quilometragem só pode subir (odômetro real não anda pra trás) — rejeita valores menores que
 * o atual. */
export async function atualizarQuilometragem(veiculoId: string, quilometragem: number): Promise<Veiculo> {
  const supabase = createAdminClient();

  const { data: atual } = await supabase.from("veiculos").select("quilometragem").eq("id", veiculoId).maybeSingle();
  if (!atual) throw new Error("Veículo não encontrado");
  if (quilometragem < atual.quilometragem) {
    throw new Error(
      `A nova quilometragem não pode ser menor que a atual (${atual.quilometragem.toLocaleString("pt-BR")} km).`
    );
  }

  const { data, error } = await supabase
    .from("veiculos")
    .update({ quilometragem })
    .eq("id", veiculoId)
    .select()
    .single();
  if (error || !data) throw new Error("Veículo não encontrado");
  const [veiculo] = await anexarHistorico(supabase, [data]);
  return veiculo;
}
