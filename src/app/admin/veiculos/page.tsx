"use client";

import * as React from "react";
import Link from "next/link";
import { Car, Plus } from "lucide-react";

import { listarVeiculos } from "@/lib/services/veiculos.service";
import type { Veiculo } from "@/lib/types";

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
import { Button } from "@/components/ui/button";

export default function AdminVeiculosPage() {
  const [veiculos, setVeiculos] = React.useState<Veiculo[] | null>(null);

  React.useEffect(() => {
    listarVeiculos().then(setVeiculos);
  }, []);

  if (!veiculos) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Veículos</h1>
        <Button asChild size="sm">
          <Link href="/admin/veiculos/novo">
            <Plus className="size-4" />
            Adicionar veículo
          </Link>
        </Button>
      </div>

      {veiculos.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Nenhum veículo cadastrado"
          action={
            <Button asChild size="sm">
              <Link href="/admin/veiculos/novo">Adicionar veículo</Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Km</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veiculos.map((veiculo) => (
              <TableRow key={veiculo.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/veiculos/${veiculo.id}`} className="hover:text-gold">
                    {veiculo.modelo}
                  </Link>
                </TableCell>
                <TableCell>{veiculo.marca}</TableCell>
                <TableCell>{veiculo.ano}</TableCell>
                <TableCell>{veiculo.placa}</TableCell>
                <TableCell>{veiculo.categoria}</TableCell>
                <TableCell>{veiculo.quilometragem.toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
