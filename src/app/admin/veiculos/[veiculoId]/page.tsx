"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Wrench } from "lucide-react";

import { buscarVeiculoPorId } from "@/lib/services/veiculos.service";
import { formatDate } from "@/lib/utils/formatters";
import type { Veiculo } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminVeiculoDetalhePage() {
  const params = useParams<{ veiculoId: string }>();
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);

  React.useEffect(() => {
    buscarVeiculoPorId(params.veiculoId).then((v) => setVeiculo(v ?? null));
  }, [params.veiculoId]);

  if (!veiculo) return <Skeleton className="h-96 w-full" />;

  const ficha: [string, string][] = [
    ["Placa", veiculo.placa],
    ["Renavam", veiculo.renavam],
    ["Chassi", veiculo.chassi],
    ["Cor", veiculo.cor],
    ["Categoria", veiculo.categoria],
    ["Combustível", veiculo.combustivel],
    ["Quilometragem", `${veiculo.quilometragem.toLocaleString("pt-BR")} km`],
    ["Seguradora", veiculo.seguradora],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="lg:flex-row lg:items-center">
        <div className="relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/50 lg:w-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={veiculo.fotoUrl} alt={veiculo.modelo} className="h-full w-full object-contain p-4" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {veiculo.marca} {veiculo.modelo} ({veiculo.ano})
          </h1>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            {ficha.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wrench className="size-4 text-gold" />
            Histórico de manutenção
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {veiculo.historicoManutencao.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium text-foreground">{item.descricao}</p>
                <p className="text-xs text-muted-foreground">{item.oficina}</p>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(item.data)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
