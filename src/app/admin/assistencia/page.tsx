"use client";

import * as React from "react";
import { Siren } from "lucide-react";

import { listarSolicitacoes } from "@/lib/services/assistencia.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Cliente, SolicitacaoAssistencia } from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";

const LABEL_TIPO: Record<string, string> = {
  guincho: "Guincho",
  pane_mecanica: "Pane mecânica",
  pane_eletrica: "Pane elétrica",
  chaveiro: "Chaveiro",
  troca_pneu: "Troca de pneu",
  acidente: "Acidente",
  bateria: "Bateria",
  falta_combustivel: "Falta de combustível",
};

export default function AdminAssistenciaPage() {
  const [solicitacoes, setSolicitacoes] = React.useState<SolicitacaoAssistencia[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);

  React.useEffect(() => {
    listarSolicitacoes().then(setSolicitacoes);
    listarClientes().then(setClientes);
  }, []);

  if (!solicitacoes) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Assistência 24h</h1>

      {solicitacoes.length === 0 ? (
        <EmptyState
          icon={Siren}
          title="Nenhuma solicitação registrada"
          description="Solicitações feitas pelo portal do cliente aparecerão aqui nesta sessão."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocolo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Solicitado em</TableHead>
              <TableHead>Tempo estimado</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitacoes.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.protocolo}</TableCell>
                <TableCell>{clientes.find((c) => c.id === s.clienteId)?.nome ?? "—"}</TableCell>
                <TableCell>{LABEL_TIPO[s.tipo]}</TableCell>
                <TableCell>{formatDateTime(s.criadoEm)}</TableCell>
                <TableCell>{s.tempoEstimadoMin} min</TableCell>
                <TableCell>
                  <StatusPill status={s.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
