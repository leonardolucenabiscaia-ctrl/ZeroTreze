"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";

import { listarMultas } from "@/lib/services/multas.service";
import { listarContratos } from "@/lib/services/contratos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";
import type { Cliente, Contrato, Multa } from "@/lib/types";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminMultasPage() {
  const [multas, setMultas] = React.useState<Multa[] | null>(null);
  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);

  React.useEffect(() => {
    listarMultas().then(setMultas);
    listarContratos().then(setContratos);
    listarClientes().then(setClientes);
  }, []);

  if (!multas) return <Skeleton className="h-96 w-full" />;

  function clienteDaMulta(multa: Multa) {
    const contrato = contratos.find((c) => c.id === multa.contratoId);
    return clientes.find((c) => c.id === contrato?.clienteId)?.nome ?? "—";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Multas de trânsito</h1>
        <Button asChild size="sm">
          <Link href="/admin/multas/novo">
            <Plus className="size-4" />
            Adicionar multa
          </Link>
        </Button>
      </div>

      {multas.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Nenhuma multa registrada" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Ciência do cliente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {multas.map((multa) => (
              <TableRow key={multa.id}>
                <TableCell className="font-mono text-xs">{multa.numeroAuto}</TableCell>
                <TableCell>{clienteDaMulta(multa)}</TableCell>
                <TableCell>{multa.orgao}</TableCell>
                <TableCell>{formatDate(multa.data)}</TableCell>
                <TableCell>{formatCurrency(multa.valor)}</TableCell>
                <TableCell>{multa.pontos}</TableCell>
                <TableCell>{formatDate(multa.vencimento)}</TableCell>
                <TableCell>
                  <StatusPill status={multa.situacao} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {multa.cienciaEm ? (
                    formatDateTime(multa.cienciaEm)
                  ) : (
                    <Badge variant="destructive">Pendente</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
