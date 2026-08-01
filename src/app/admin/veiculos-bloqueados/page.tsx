"use client";

import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

import { listarVeiculosBloqueados } from "@/lib/services/veiculos.service";
import { contratoAtivoPorVeiculo } from "@/lib/services/contratos.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Contrato, Veiculo } from "@/lib/types";

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

interface LinhaVeiculoBloqueado {
  veiculo: Veiculo;
  contrato: Contrato | undefined;
}

export default function VeiculosBloqueadosPage() {
  const [linhas, setLinhas] = React.useState<LinhaVeiculoBloqueado[] | null>(null);

  React.useEffect(() => {
    listarVeiculosBloqueados().then(async (veiculos) => {
      const comContrato = await Promise.all(
        veiculos.map(async (veiculo) => ({
          veiculo,
          contrato: await contratoAtivoPorVeiculo(veiculo.id),
        }))
      );
      setLinhas(comContrato);
    });
  }, []);

  if (!linhas) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Veículos bloqueados</h1>
        <p className="text-sm text-muted-foreground">
          Veículos com o uso bloqueado — o contrato de cada um continua rodando normalmente.
        </p>
      </div>

      {linhas.length === 0 ? (
        <EmptyState
          icon={Lock}
          title="Nenhum veículo bloqueado"
          description="Todos os veículos da frota estão liberados para uso."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Bloqueado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(({ veiculo, contrato }) => (
              <TableRow key={veiculo.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/veiculos/${veiculo.id}`} className="hover:text-gold">
                    {veiculo.marca} {veiculo.modelo}
                  </Link>
                </TableCell>
                <TableCell>{veiculo.placa}</TableCell>
                <TableCell>
                  {contrato ? (
                    <Link href={`/admin/contratos/${contrato.id}`} className="text-gold hover:underline">
                      {contrato.numero}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Sem contrato ativo</span>
                  )}
                </TableCell>
                <TableCell>{veiculo.bloqueadoEm ? formatDateTime(veiculo.bloqueadoEm) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
