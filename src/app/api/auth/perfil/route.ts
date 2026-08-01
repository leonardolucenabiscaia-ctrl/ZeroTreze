import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { mapCliente, mapUsuario } from "@/lib/server/mappers";

/** Retorna o `usuario`/`cliente` de quem está logado agora (sessão lida pelos cookies da
 * requisição) — usado por `auth-context.tsx` depois de qualquer login ou ao carregar a página. */
export async function GET() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: usuarioRow, error } = await admin.from("usuarios").select("*").eq("id", user.id).single();

  if (error || !usuarioRow) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  let cliente = null;
  if (usuarioRow.perfil === "cliente") {
    const { data: clienteRow } = await admin
      .from("clientes")
      .select("*")
      .eq("usuario_id", user.id)
      .maybeSingle();
    cliente = clienteRow ? mapCliente(clienteRow) : null;
  }

  return NextResponse.json({ usuario: mapUsuario(usuarioRow), cliente });
}
