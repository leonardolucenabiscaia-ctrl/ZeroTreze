import type { PerfilUsuario } from "@/lib/types";

export type RecursoAdmin =
  | "dashboard"
  | "clientes"
  | "contratos"
  | "veiculos"
  | "financeiro"
  | "cobranca"
  | "acordos"
  | "notificacoes"
  | "chamados"
  | "assistencia"
  | "multas"
  | "documentos"
  | "usuarios"
  | "permissoes"
  | "relatorios"
  | "configuracoes"
  | "auditoria";

const RECURSOS_POR_PERFIL: Record<PerfilUsuario, RecursoAdmin[] | "todos"> = {
  cliente: [],
  operador: [
    "dashboard",
    "clientes",
    "contratos",
    "veiculos",
    "financeiro",
    "cobranca",
    "acordos",
    "notificacoes",
    "chamados",
    "assistencia",
    "multas",
    "documentos",
  ],
  gestor: [
    "dashboard",
    "clientes",
    "contratos",
    "veiculos",
    "financeiro",
    "cobranca",
    "acordos",
    "notificacoes",
    "chamados",
    "assistencia",
    "multas",
    "documentos",
    "relatorios",
  ],
  administrador: "todos",
};

export function podeAcessar(perfil: PerfilUsuario, recurso: RecursoAdmin): boolean {
  const recursos = RECURSOS_POR_PERFIL[perfil];
  if (recursos === "todos") return true;
  return recursos.includes(recurso);
}
