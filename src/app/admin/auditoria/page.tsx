"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";

import { RoleGuard } from "@/lib/auth/route-guards";
import { listarAuditoria } from "@/lib/services/auditoria.service";
import { listarUsuariosInternos } from "@/lib/services/usuarios.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { LogAuditoria, PerfilUsuario, Usuario } from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/stat-card";

const TODOS = "todos";

const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  cliente: "Cliente",
  operador: "Operador",
  gestor: "Gestor",
  administrador: "Administrador",
};

interface LinhaLog extends LogAuditoria {
  perfilAutor?: PerfilUsuario;
}

function AuditoriaConteudo() {
  const [logs, setLogs] = React.useState<LinhaLog[] | null>(null);
  const [equipe, setEquipe] = React.useState<Usuario[]>([]);
  const [filtroUsuarioId, setFiltroUsuarioId] = React.useState(TODOS);
  const [filtroPerfil, setFiltroPerfil] = React.useState<PerfilUsuario | typeof TODOS>(TODOS);
  const [dataInicio, setDataInicio] = React.useState("");
  const [dataFim, setDataFim] = React.useState("");

  React.useEffect(() => {
    Promise.all([listarAuditoria(), listarUsuariosInternos()]).then(([logsCarregados, usuarios]) => {
      const mapaUsuarios = new Map(usuarios.map((u) => [u.id, u]));
      const logsDaEquipe = logsCarregados.map((log) => ({
        ...log,
        perfilAutor: mapaUsuarios.get(log.usuarioId)?.perfil,
      }));
      setLogs(logsDaEquipe);
      setEquipe(usuarios);
    });
  }, []);

  if (!logs) return <Skeleton className="h-96 w-full" />;

  const filtrados = logs.filter((log) => {
    if (filtroUsuarioId !== TODOS && log.usuarioId !== filtroUsuarioId) return false;
    if (filtroPerfil !== TODOS && log.perfilAutor !== filtroPerfil) return false;
    const dataLog = new Date(log.criadoEm);
    if (dataInicio && dataLog < new Date(`${dataInicio}T00:00:00`)) return false;
    if (dataFim && dataLog > new Date(`${dataFim}T23:59:59`)) return false;
    return true;
  });

  const totalAdministradores = filtrados.filter((l) => l.perfilAutor === "administrador").length;
  const totalGestores = filtrados.filter((l) => l.perfilAutor === "gestor").length;
  const totalOperadores = filtrados.filter((l) => l.perfilAutor === "operador").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Tudo que administradores, gestores e operadores fizeram na plataforma — cadastros, contratos,
          pagamentos, multas e mais. Visível apenas para administradores.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total de ações no período" value={String(filtrados.length)} icon={ClipboardList} />
        <StatCard
          label="Ações de administradores"
          value={String(totalAdministradores)}
          icon={ClipboardList}
          tone="destructive"
        />
        <StatCard label="Ações de gestores" value={String(totalGestores)} icon={ClipboardList} tone="warning" />
        <StatCard label="Ações de operadores" value={String(totalOperadores)} icon={ClipboardList} tone="success" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Responsável</Label>
          <Select value={filtroUsuarioId} onValueChange={setFiltroUsuarioId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {equipe.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome} ({PERFIL_LABEL[u.perfil]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Perfil</Label>
          <Select
            value={filtroPerfil}
            onValueChange={(valor) => setFiltroPerfil(valor as PerfilUsuario | typeof TODOS)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="operador">Operador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="data-inicio">De</Label>
          <Input
            id="data-inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="data-fim">Até</Label>
          <Input
            id="data-fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma ação encontrada"
          description="Ajuste os filtros ou aguarde novas ações da equipe."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/hora</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Referência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(log.criadoEm)}</TableCell>
                <TableCell className="font-medium">{log.usuarioNome}</TableCell>
                <TableCell>
                  {log.perfilAutor ? (
                    <Badge variant={log.perfilAutor === "administrador" ? "gold" : "neutral"}>
                      {PERFIL_LABEL[log.perfilAutor]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{log.acao}</TableCell>
                <TableCell className="text-muted-foreground">
                  {log.entidade} — {log.entidadeId}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function AuditoriaPage() {
  return (
    <RoleGuard perfisPermitidos={["administrador"]} redirecionarPara="/admin/dashboard">
      <AuditoriaConteudo />
    </RoleGuard>
  );
}
