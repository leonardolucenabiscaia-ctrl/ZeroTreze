"use client";

import * as React from "react";
import Link from "next/link";
import { CircleSlash } from "lucide-react";

import { listarVeiculosIndisponiveis } from "@/lib/services/veiculos.service";
import { formatDateTime } from "@/lib/utils/formatters";
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

export default function VeiculosIndisponiveisPage() {
  const [veiculos, setVeiculos] = React.useState<Veiculo[] | null>(null);

  React.useEffect(() => {
    listarVeiculosIndisponiveis().then(setVeiculos);
  }, []);

  if (!veiculos) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Veículos indisponíveis</h1>
        <p className="text-sm text-muted-foreground">
          Veículos pausados temporariamente pela equipe (reservado, aguardando limpeza/documentação
          etc.) — diferente de bloqueio ou manutenção.
        </p>
      </div>

      {veiculos.length === 0 ? (
        <EmptyState
          icon={CircleSlash}
          title="Nenhum veículo indisponível"
          description="Todos os veículos fora de contrato, bloqueio ou manutenção estão disponíveis."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Indisponível desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {veiculos.map((veiculo) => (
              <TableRow key={veiculo.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/veiculos/${veiculo.id}`} className="hover:text-gold">
                    {veiculo.marca} {veiculo.modelo}
                  </Link>
                </TableCell>
                <TableCell>{veiculo.placa}</TableCell>
                <TableCell>{veiculo.indisponivelDesde ? formatDateTime(veiculo.indisponivelDesde) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
