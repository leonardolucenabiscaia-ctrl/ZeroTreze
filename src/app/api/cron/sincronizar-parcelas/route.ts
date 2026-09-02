import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sincronizarTodosOsContratos } from "@/lib/server/financeiro.service";

// Vercel Cron: roda 1x por dia, 1h antes do cron de lembretes (ver vercel.json) — garante que o
// status das parcelas (vencido / próxima liberada) já está 100% atualizado quando os lembretes de
// atraso são disparados. Antes, essa sincronização rodava sob demanda a cada leitura da aba
// Financeiro, o que deixava a tela lenta em contratos antigos (ver financeiro.service.ts).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const autorizacao = request.headers.get("authorization");
    if (autorizacao !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  await sincronizarTodosOsContratos(supabase);

  return NextResponse.json({ ok: true });
}
