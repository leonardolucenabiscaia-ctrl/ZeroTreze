"use client";

import { Car, ShieldCheck, Wrench } from "lucide-react";

import { useContratoAtivo } from "@/hooks/use-contrato-ativo";
import { formatDate } from "@/lib/utils/formatters";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="size-4 text-gold" />
              Seguro e assistência
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">Seguradora</p>
              <p className="font-medium text-foreground">{veiculo.seguradora}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">Apólice</p>
              <p className="font-medium text-foreground">{veiculo.numeroApolice}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">Assistência 24h</p>
              <p className="font-medium text-success">{veiculo.assistencia247 ? "Ativa" : "Inativa"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">Garantia até</p>
              <p className="font-medium text-foreground">{formatDate(veiculo.garantiaAte)}</p>
            </div>
          </CardContent>
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
                <div className="text-right text-xs text-muted-foreground">
                  <p>{formatDate(item.data)}</p>
                  <p>{item.km.toLocaleString("pt-BR")} km</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
