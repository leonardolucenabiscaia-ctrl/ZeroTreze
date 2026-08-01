import type { NextRequest } from "next/server";
import { listarExtratoPorContrato } from "@/lib/server/financeiro.service";
import { handleRoute } from "@/lib/server/route-helpers";

export async function GET(request: NextRequest) {
  const contratoId = request.nextUrl.searchParams.get("contratoId");
  return handleRoute(() => (contratoId ? listarExtratoPorContrato(contratoId) : Promise.resolve([])));
}
