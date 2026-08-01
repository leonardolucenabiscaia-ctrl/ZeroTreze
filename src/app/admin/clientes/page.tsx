"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { listarClientes } from "@/lib/services/clientes.service";
import { listarScores } from "@/lib/services/score.service";
import { formatDocument } from "@/lib/utils/formatters";
import type { Cliente, ScoreLocatario } from "@/lib/types";

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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ClientesPage() {
  const [clientes, setClientes] = React.useState<Cliente[] | null>(null);
  const [scores, setScores] = React.useState<ScoreLocatario[]>([]);
  const [busca, setBusca] = React.useState("");

  React.useEffect(() => {
    listarClientes().then(setClientes);
    listarScores().then(setScores);
  }, []);

  if (!clientes) return <Skeleton className="h-96 w-full" />;

  const filtrados = clientes.filter((c) =>
    `${c.nome} ${c.documento}`.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Clientes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por nome ou documento…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-64"
          />
          <Button asChild size="sm">
            <Link href="/admin/clientes/novo">
              <Plus className="size-4" />
              Adicionar novo cliente
            </Link>
          </Button>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente encontrado" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Cliente desde</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((cliente) => {
              const score = scores.find((s) => s.clienteId === cliente.id);
              return (
                <TableRow key={cliente.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/admin/clientes/${cliente.id}`} className="hover:text-gold">
                      {cliente.nome}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDocument(cliente.documento)}</TableCell>
                  <TableCell>
                    {cliente.endereco.cidade}/{cliente.endereco.estado}
                  </TableCell>
                  <TableCell>{new Date(cliente.clienteDesde).getFullYear()}</TableCell>
                  <TableCell>
                    {score && (
                      <Badge variant="gold" className="capitalize">
                        {score.pontuacao} · {score.categoria}
                      </Badge>
                    )}
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
