import { Car } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "./status-pill";
import { formatDate } from "@/lib/utils/formatters";
import type { Contrato, Veiculo } from "@/lib/types";

export function VehicleCard({
  veiculo,
  contrato,
  actions,
}: {
  veiculo: Veiculo;
  contrato: Contrato;
  actions?: React.ReactNode;
}) {
  return (
    <Card className="gap-5 lg:flex-row lg:items-center">
      <div className="relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/50 lg:h-32 lg:w-48">
        {veiculo.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={veiculo.fotoUrl}
            alt={`${veiculo.marca} ${veiculo.modelo}`}
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <Car className="size-10 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Contrato {contrato.numero}</p>
            <h2 className="text-xl font-semibold text-foreground">
              {veiculo.marca} {veiculo.modelo}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {veiculo.bloqueado && <Badge variant="destructive">Veículo bloqueado</Badge>}
            <StatusPill status={contrato.status} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Info label="Ano" value={String(veiculo.ano)} />
          <Info label="Cor" value={veiculo.cor} />
          <Info label="Placa" value={veiculo.placa} />
          <Info label="Renavam" value={veiculo.renavam} />
          <Info label="Início" value={formatDate(contrato.dataInicio)} />
          <Info label="Fim" value={formatDate(contrato.dataFim)} />
        </dl>

        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
