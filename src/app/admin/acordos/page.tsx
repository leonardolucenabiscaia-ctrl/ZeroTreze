"use client";

import * as React from "react";
import Link from "next/link";
import { FileCheck2, Handshake, Plus } from "lucide-react";

import { listarAcordos } from "@/lib/services/acordos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { assinaturaConcluida } from "@/lib/utils/assinatura";
import { Badge } from "@/components/ui/badge";
import type { Acordo, Cliente } from "@/lib/types";

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

export default function AdminAcordosPage() {
  const [acordos, setAcordos] = React.useState<Acordo[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);

  React.useEffect(() => {
    listarAcordos().then(setAcordos);
    listarClientes().then(setClientes);
  }, []);

  if (!acordos) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Acordos</h1>
        <Button asChild size="sm">
          <Link href="/admin/acordos/novo">
            <Plus className="size-4" />
            Novo acordo
          </Link>
        </Button>
      </div>

      {acordos.length === 0 ? (
        <EmptyState icon={Handshake} title="Nenhum acordo registrado" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor total</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Assinatura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {acordos.map((acordo) => (
              <TableRow key={acordo.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/acordos/${acordo.id}`} className="hover:text-gold">
                    {acordo.numero}
                  </Link>
                </TableCell>
                <TableCell>{clientes.find((c) => c.id === acordo.clienteId)?.nome ?? "—"}</TableCell>
                <TableCell>{formatCurrency(acordo.valorTotal)}</TableCell>
                <TableCell>{formatCurrency(acordo.valorEntrada)}</TableCell>
                <TableCell>{acordo.cronograma.length}x</TableCell>
                <TableCell>
                  <StatusPill status={acordo.situacao} />
                </TableCell>
                <TableCell>
                  {acordo.assinatura ? (
                    assinaturaConcluida(acordo.assinatura.status) ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="success">
                          <FileCheck2 className="size-3" />
                          Assinado
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(acordo.assinatura.atualizadoEm ?? acordo.assinatura.enviadoEm)}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="warning">{acordo.assinatura.status}</Badge>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
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
