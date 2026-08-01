import { Check, X } from "lucide-react";

import { podeAcessar, type RecursoAdmin } from "@/lib/auth/permissions";
import type { PerfilUsuario } from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RECURSOS: RecursoAdmin[] = [
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
  "usuarios",
  "permissoes",
  "relatorios",
  "auditoria",
  "configuracoes",
];

const RECURSO_LABEL: Record<RecursoAdmin, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  contratos: "Contratos",
  veiculos: "Veículos",
  financeiro: "Financeiro",
  cobranca: "Cobrança",
  acordos: "Acordos",
  notificacoes: "Notificações",
  chamados: "Chamados",
  assistencia: "Assistência",
  multas: "Multas",
  documentos: "Documentos",
  usuarios: "Usuários",
  permissoes: "Permissões",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
  auditoria: "Auditoria",
};

const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  cliente: "Cliente",
  operador: "Operador",
  gestor: "Gestor",
  administrador: "Administrador",
};

const PERFIS: PerfilUsuario[] = ["operador", "gestor", "administrador"];

export default function PermissoesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Permissões</h1>
        <p className="text-sm text-muted-foreground">
          Recursos do backoffice disponíveis por perfil de acesso.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recurso</TableHead>
            {PERFIS.map((perfil) => (
              <TableHead key={perfil} className="text-center">
                {PERFIL_LABEL[perfil]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {RECURSOS.map((recurso) => (
            <TableRow key={recurso}>
              <TableCell className="font-medium">{RECURSO_LABEL[recurso]}</TableCell>
              {PERFIS.map((perfil) => (
                <TableCell key={perfil} className="text-center">
                  {podeAcessar(perfil, recurso) ? (
                    <Check className="mx-auto size-4 text-success" />
                  ) : (
                    <X className="mx-auto size-4 text-muted-foreground/40" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
