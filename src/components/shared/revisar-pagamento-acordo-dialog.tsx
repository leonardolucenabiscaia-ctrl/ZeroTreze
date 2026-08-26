"use client";

import * as React from "react";
import { File as FileIcon, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusPill } from "./status-pill";
import { listarComprovantesPorParcelaAcordo } from "@/lib/services/financeiro-acordos.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Documento, ParcelaAcordo } from "@/lib/types";

/** Mesmo fluxo do `RevisarPagamentoDialog` das parcelas de contrato, sem juros/multa/correção. */
export function RevisarPagamentoAcordoDialog({
  parcela,
  clienteNome,
  acordoNumero,
  open,
  onOpenChange,
  onConfirmar,
  onRecusar,
}: {
  parcela: ParcelaAcordo | null;
  clienteNome: string;
  acordoNumero: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: (parcelaAcordoId: string) => Promise<void>;
  onRecusar: (parcelaAcordoId: string) => Promise<void>;
}) {
  const [comprovantes, setComprovantes] = React.useState<Documento[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [processando, setProcessando] = React.useState<"confirmar" | "recusar" | null>(null);

  React.useEffect(() => {
    if (!open || !parcela) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    listarComprovantesPorParcelaAcordo(parcela.id)
      .then(setComprovantes)
      .finally(() => setCarregando(false));
  }, [open, parcela]);

  if (!parcela) return null;

  async function handleConfirmar() {
    setProcessando("confirmar");
    try {
      await onConfirmar(parcela!.id);
    } finally {
      setProcessando(null);
    }
  }

  async function handleRecusar() {
    setProcessando("recusar");
    try {
      await onRecusar(parcela!.id);
    } finally {
      setProcessando(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Revisar pagamento
            <StatusPill status={parcela.status} />
          </DialogTitle>
          <DialogDescription>
            {clienteNome} · Acordo {acordoNumero} · Parcela {parcela.numero}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor</dt>
            <dd className="font-medium text-gold">{formatCurrency(parcela.valor)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Forma de pagamento</dt>
            <dd className="font-medium text-foreground">{parcela.formaPagamento?.toUpperCase() ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Vencimento</dt>
            <dd className="font-medium text-foreground">{formatDate(parcela.vencimento)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Comprovante enviado</dt>
            <dd className="font-medium text-foreground">
              {parcela.dataEnvioComprovante ? formatDate(parcela.dataEnvioComprovante) : "—"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Anexos enviados pelo cliente</span>
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando anexos…
            </div>
          ) : comprovantes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              O cliente não anexou comprovante — confira o recebimento diretamente na conta bancária.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {comprovantes.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm"
                >
                  <FileIcon className="size-4 shrink-0 text-gold" />
                  <span className="truncate text-foreground">{doc.nome}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Confirme somente após verificar o recebimento na conta bancária da Zero Treze.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRecusar} disabled={processando !== null}>
              {processando === "recusar" ? "Recusando…" : "Recusar"}
            </Button>
            <Button onClick={handleConfirmar} disabled={processando !== null}>
              {processando === "confirmar" ? "Confirmando…" : "Confirmar pagamento"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
