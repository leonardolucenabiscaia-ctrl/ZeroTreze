"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import {
  confirmarCienciaMulta,
  listarMultasPendentesDeCienciaPorCliente,
} from "@/lib/services/multas.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Multa } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function TelaCarregando() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
}

/**
 * Bloqueia todo o portal do cliente (nada além desta tela é renderizado — sem sidebar, sem
 * navegação) enquanto houver multa sem ciência confirmada. A ciência do locatário é obrigatória
 * para a continuidade do uso do portal.
 */
export function MultaCienciaGate({ children }: { children: React.ReactNode }) {
  const { cliente } = useAuth();
  const [pendentes, setPendentes] = React.useState<Multa[] | null>(null);
  const [confirmandoId, setConfirmandoId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!cliente) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendentes([]);
      return;
    }
    let ativo = true;
    listarMultasPendentesDeCienciaPorCliente(cliente.id).then((multas) => {
      if (ativo) setPendentes(multas);
    });
    return () => {
      ativo = false;
    };
  }, [cliente]);

  async function handleConfirmar(multaId: string) {
    setConfirmandoId(multaId);
    try {
      await confirmarCienciaMulta(multaId);
      setPendentes((atuais) => (atuais ?? []).filter((m) => m.id !== multaId));
      toast.success("Ciência confirmada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível confirmar a ciência.");
    } finally {
      setConfirmandoId(null);
    }
  }

  if (pendentes === null) return <TelaCarregando />;
  if (pendentes.length === 0) return <>{children}</>;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertTriangle className="size-10 text-destructive" />
          <h1 className="text-xl font-semibold text-foreground">
            {pendentes.length > 1 ? "Você tem multas pendentes de ciência" : "Você tem uma multa pendente de ciência"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Para continuar usando o portal, confirme que está ciente {pendentes.length > 1 ? "de cada multa" : "da multa"} abaixo.
          </p>
        </div>

        {pendentes.map((multa) => (
          <Card key={multa.id}>
            <CardHeader>
              <CardTitle className="text-base text-foreground">
                Auto {multa.numeroAuto} — {multa.orgao}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <dt className="text-[11px] uppercase text-muted-foreground">Infração</dt>
                  <dd className="font-medium text-foreground">{multa.descricao}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase text-muted-foreground">Data da infração</dt>
                  <dd className="font-medium text-foreground">{formatDate(multa.data)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase text-muted-foreground">Vencimento</dt>
                  <dd className="font-medium text-foreground">{formatDate(multa.vencimento)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase text-muted-foreground">Valor</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(multa.valor)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase text-muted-foreground">Pontos na CNH</dt>
                  <dd className="font-medium text-foreground">{multa.pontos}</dd>
                </div>
              </dl>

              <Button onClick={() => handleConfirmar(multa.id)} disabled={confirmandoId === multa.id}>
                {confirmandoId === multa.id ? "Confirmando…" : "Estou ciente (Lido)"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
