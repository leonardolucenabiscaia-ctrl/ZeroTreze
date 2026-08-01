import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { mapDocumento } from "./mappers";
import type { CategoriaDocumento, Documento } from "@/lib/types";

export async function listarDocumentosPorCliente(
  clienteId: string,
  categoria?: CategoriaDocumento
): Promise<Documento[]> {
  const supabase = createAdminClient();
  let query = supabase.from("documentos").select("*").eq("cliente_id", clienteId);
  if (categoria) query = query.eq("categoria", categoria);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocumento);
}

export async function listarDocumentos(): Promise<Documento[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("documentos").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocumento);
}
