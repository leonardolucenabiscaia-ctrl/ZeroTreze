import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processarLembreteDeParcela, type ParcelaComContrato } from "@/lib/server/lembretes-parcelas.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// Rota TEMPORÁRIA só para o teste manual do disparo de WhatsApp com um cliente descartável —
// processa uma única parcela (por id) em vez do lote inteiro do cron, pra não arriscar reenviar
// lembrete a clientes reais. Remover depois do teste.
export async function POST(request: NextRequest) {
  return handleRoute(
    async () => {
      const { parcelaId } = await request.json();
      const supabase = createAdminClient();
      const { data: parcela, error } = await supabase
        .from("parcelas")
        .select("id, valor_original, data_vencimento, contrato_id, contratos!inner(cliente_id)")
        .eq("id", parcelaId)
        .single();
      if (error || !parcela) throw new Error("Parcela não encontrada.");
      const resultado = await processarLembreteDeParcela(supabase, parcela as unknown as ParcelaComContrato);
      return { resultado };
    },
    200,
    PERFIS_STAFF
  );
}
