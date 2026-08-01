"use client";

import * as React from "react";
import Link from "next/link";
import { Handshake, Printer } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { listarAcordosPorCliente } from "@/lib/services/acordos.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Acordo } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function AcordosPage() {
  const { cliente } = useAuth();
  const [acordos, setAcordos] = React.useState<Acordo[] | null>(null);

  React.useEffect(() => {
    if (!cliente) return;
    listarAcordosPorCliente(cliente.id).then(setAcordos);
  }, [cliente]);

  if (!acordos) return <Skeleton className="h-96 w-full" />;
  if (acordos.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="Nenhum acordo ativo"
        description="Quando você fechar um acordo de renegociação, ele aparecerá aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Acordos</h1>

      {acordos.map((acordo) => {
        const pagas = acordo.cronograma.filter((p) => p.pago);
        const valorPago = acordo.valorEntrada + pagas.reduce((soma, p) => soma + p.valor, 0);
        const progresso = Math.round((valorPago / acordo.valorTotal) * 100);

        return (
          <Card key={acordo.id}>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Acordo {acordo.numero}</CardTitle>
              <StatusPill status={acordo.situacao} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[11px] uppercase text-muted-foreground">Valor total</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(acordo.valorTotal)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase text-muted-foreground">Entrada</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(acordo.valorEntrada)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase text-muted-foreground">Valor pago</dt>
                  <dd className="font-medium text-success">{formatCurrency(valorPago)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase text-muted-foreground">Saldo</dt>
                  <dd className="font-medium text-foreground">
                    {formatCurrency(acordo.valorTotal - valorPago)}
                  </dd>
                </div>
              </dl>

              <Progress value={progresso} />

              {acordo.descricao && (
                <p className="rounded-lg bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                  {acordo.descricao}
                </p>
              )}

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">Cronograma de pagamentos</p>
                {acordo.cronograma.map((parcela) => (
                  <div
                    key={parcela.numero}
                    className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm"
                  >
                    <span>
                      Parcela {parcela.numero} — {formatDate(parcela.vencimento)}
                    </span>
                    <span className="flex items-center gap-2">
                      {formatCurrency(parcela.valor)}
                      <StatusPill status={parcela.pago ? "pago" : "em_aberto"} />
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/imprimir/acordo/${acordo.id}`}>
                    <Printer className="size-4" />
                    Imprimir acordo
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
