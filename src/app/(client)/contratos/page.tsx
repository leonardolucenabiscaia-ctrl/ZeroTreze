"use client";

import * as React from "react";
import Link from "next/link";
import { Download, FileText, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { listarContratosPorCliente } from "@/lib/services/contratos.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Contrato } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";

export default function ContratosPage() {
  const { cliente } = useAuth();
  const [contratos, setContratos] = React.useState<Contrato[] | null>(null);

  React.useEffect(() => {
    if (!cliente) return;
    listarContratosPorCliente(cliente.id).then(setContratos);
  }, [cliente]);

  function acao(mensagem: string) {
    toast.success(mensagem);
  }

  if (!contratos) return <Skeleton className="h-96 w-full" />;
  if (contratos.length === 0) {
    return <EmptyState icon={FileText} title="Nenhum contrato encontrado" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Contratos</h1>

      {contratos.map((contrato) => (
        <Card key={contrato.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <FileText className="size-4 text-gold" />
              Contrato {contrato.numero}
            </CardTitle>
            <StatusPill status={contrato.status} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Início</dt>
                <dd className="font-medium text-foreground">{formatDate(contrato.dataInicio)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Fim</dt>
                <dd className="font-medium text-foreground">{formatDate(contrato.dataFim)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Parcela semanal</dt>
                <dd className="font-medium text-foreground">{formatCurrency(contrato.valorParcela)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-muted-foreground">Caução</dt>
                <dd className="font-medium text-foreground">{formatCurrency(contrato.valorCaucao)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" asChild>
                <Link href={`/imprimir/contrato/${contrato.id}`}>
                  <Printer className="size-4" />
                  Imprimir contrato
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => acao("Download iniciado.")}>
                <Download className="size-4" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={() => acao("Link de compartilhamento copiado.")}>
                <Share2 className="size-4" />
                Compartilhar
              </Button>
            </div>

            {contrato.aditivos.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Aditivos e renovações</p>
                {contrato.aditivos.map((aditivo) => (
                  <div key={aditivo.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                    <span>{aditivo.descricao}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(aditivo.data)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
