"use client";

import { Car } from "lucide-react";

import { useContratoAtivo } from "@/hooks/use-contrato-ativo";
import { formatDate } from "@/lib/utils/formatters";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

export default function VeiculoPage() {
  const { veiculo, loading } = useContratoAtivo();

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!veiculo) return <EmptyState icon={Car} title="Nenhum veículo vinculado" />;

  const ficha: [string, string][] = [
    ["Modelo", veiculo.modelo],
    ["Marca", veiculo.marca],
    ["Ano", String(veiculo.ano)],
    ["Placa", veiculo.placa],
    ["Renavam", veiculo.renavam],
    ["Chassi", veiculo.chassi],
    ["Cor", veiculo.cor],
    ["Categoria", veiculo.categoria],
    ["Combustível", veiculo.combustivel],
    ["Quilometragem", `${veiculo.quilometragem.toLocaleString("pt-BR")} km`],
    ["Última revisão", formatDate(veiculo.ultimaRevisao)],
    ["Próxima revisão", formatDate(veiculo.proximaRevisao)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Veículo</h1>

      <Card className="lg:flex-row lg:items-center">
        <div className="relative flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/50 lg:w-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={veiculo.fotoUrl}
            alt={`${veiculo.marca} ${veiculo.modelo}`}
            className="h-full w-full object-contain p-4"
          />
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          {ficha.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
