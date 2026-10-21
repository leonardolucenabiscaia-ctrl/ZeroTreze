import type { NextRequest } from "next/server";
import { atualizarChecklistContrato } from "@/lib/server/contratos.service";
import { buscarUsuarioPorId } from "@/lib/server/usuarios.service";
import { handleRoute, PERFIS_STAFF } from "@/lib/server/route-helpers";

// Quem salvou o checklist (pro log de auditoria) vem sempre da sessão — nunca do corpo da
// requisição. FormData porque o checklist pode vir acompanhado de novos anexos.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleRoute(
    async ({ userId }) => {
      const usuario = await buscarUsuarioPorId(userId);
      if (!usuario) throw new Error("Usuário não encontrado.");
      const formData = await request.formData();
      const dados = {
        pneusOk: formData.get("pneusOk") === "true",
        odometroOk: formData.get("odometroOk") === "true",
        odometroKm: Number(formData.get("odometroKm")),
        latariaOk: formData.get("latariaOk") === "true",
        bateriaOk: formData.get("bateriaOk") === "true",
        observacao: String(formData.get("observacao") ?? ""),
      };
      const anexos = formData.getAll("anexos").filter((v): v is File => v instanceof File);
      return atualizarChecklistContrato(id, dados, usuario.nome, anexos);
    },
    200,
    PERFIS_STAFF
  );
}
