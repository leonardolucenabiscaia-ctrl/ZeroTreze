"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock, MapPin } from "lucide-react";

import { buscarSolicitacaoPorProtocolo } from "@/lib/services/assistencia.service";
import type { SolicitacaoAssistencia } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/shared/status-pill";
import { EmptyState } from "@/components/shared/empty-state";

const LABEL_TIPO: Record<string, string> = {
  guincho: "Guincho",
  pane_mecanica: "Pane mecânica",
  pane_eletrica: "Pane elétrica",
  chaveiro: "Chaveiro",
  troca_pneu: "Troca de pneu",
  acidente: "Acidente",
  bateria: "Bateria",
  falta_combustivel: "Falta de combustível",
};

export default function AssistenciaProtocoloPage() {
  const params = useParams<{ protocolo: string }>();
  const [solicitacao, setSolicitacao] = React.useState<SolicitacaoAssistencia | null | undefined>(undefined);

  React.useEffect(() => {
    buscarSolicitacaoPorProtocolo(params.protocolo).then((s) => setSolicitacao(s ?? null));
  }, [params.protocolo]);

  if (solicitacao === undefined) return <Skeleton className="h-72 w-full" />;
  if (!solicitacao) return <EmptyState icon={MapPin} title="Protocolo não encontrado" />;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Card className="items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="size-8 text-success" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Protocolo</p>
          <h1 className="text-2xl font-semibold text-foreground">{solicitacao.protocolo}</h1>
        </div>
        <StatusPill status={solicitacao.status} />
      </Card>

      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Tipo de ocorrência</dt>
            <dd className="font-medium text-foreground">{LABEL_TIPO[solicitacao.tipo]}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[11px] uppercase text-muted-foreground">
              <Clock className="size-3" /> Tempo estimado
            </dt>
            <dd className="font-medium text-foreground">{solicitacao.tempoEstimadoMin} minutos</dd>
          </div>
          <div className="col-span-2">
            <dt className="flex items-center gap-1 text-[11px] uppercase text-muted-foreground">
              <MapPin className="size-3" /> Localização
            </dt>
            <dd className="font-medium text-foreground">
              {solicitacao.latitude && solicitacao.longitude
                ? `${solicitacao.latitude.toFixed(5)}, ${solicitacao.longitude.toFixed(5)}`
                : "Não informada"}
            </dd>
          </div>
        </dl>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Nossa equipe já foi acionada e está a caminho. Você pode acompanhar o status por aqui.
      </p>
    </div>
  );
}
