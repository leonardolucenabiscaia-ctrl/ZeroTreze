import "server-only";
import { NextResponse } from "next/server";

/** Roda a lógica de um Route Handler, devolvendo JSON de sucesso ou `{ error }` com status 400
 * em caso de exceção — evita repetir o mesmo try/catch em cada uma das rotas de `/api/*`. */
export async function handleRoute<T>(fn: () => Promise<T>, successStatus = 200): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? null, { status: successStatus });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado." },
      { status: 400 }
    );
  }
}
