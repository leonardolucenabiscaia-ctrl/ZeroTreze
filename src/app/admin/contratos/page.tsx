"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { listarContratos } from "@/lib/services/contratos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Cliente, Contrato } from "@/lib/types";

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
import { Button } from "@/components/ui/button";

/**
 * A coluna "Fim" mostra a data do fim do prazo mínimo (6 meses) só enquanto ela ainda for
 * relevante: se o contrato já foi encerrado, mostra a data real de encerramento; se continua
 * ativo mas já passou do prazo mínimo, mostra "-" porque entrou em renovação automática semanal
 * e não tem mais uma data de fim fixa.
 */
function fimExibicao(contrato: Contrato): string {
  if (contrato.status === "encerrado") return formatDate(contrato.dataFim);
  if (new Date(contrato.dataFim).getTime() < Date.now()) return "-";
  return formatDate(contrato.dataFim);
}

export default function AdminContratosPage() {
  const [contratos, setContratos] = React.useState<Contrato[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);

  React.useEffect(() => {
    listarContratos().then(setContratos);
    listarClientes().then(setClientes);
  }, []);

  if (!contratos) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Contratos</h1>
        <Button asChild size="sm">
          <Link href="/admin/contratos/novo">
            <Plus className="size-4" />
            Iniciar novo contrato
          </Link>
        </Button>
      </div>

      {contratos.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum contrato cadastrado"
          action={
            <Button asChild size="sm">
              <Link href="/admin/contratos/novo">Iniciar novo contrato</Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.map((contrato) => {
              const cliente = clientes.find((c) => c.id === contrato.clienteId);
              return (
                <TableRow key={contrato.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/contratos/${contrato.id}`} className="hover:text-gold">
                      {contrato.numero}
                    </Link>
                  </TableCell>
                  <TableCell>{cliente?.nome ?? "—"}</TableCell>
                  <TableCell>{formatDate(contrato.dataInicio)}</TableCell>
                  <TableCell>{fimExibicao(contrato)}</TableCell>
                  <TableCell>{formatCurrency(contrato.valorParcela)}</TableCell>
                  <TableCell>
                    <StatusPill status={contrato.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
