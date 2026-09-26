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
import { listarComprovantesPorPagamentoParcialMulta } from "@/lib/services/pagamentos-parciais-multa.service";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import type { Documento, PagamentoParcialMulta } from "@/lib/types";

export function RevisarPagamentoMultaDialog({
  pagamento,
  clienteNome,
  numeroAuto,
  open,
  onOpenChange,
  onConfirmar,
  onRecusar,
}: {
  pagamento: PagamentoParcialMulta | null;
  clienteNome: string;
  numeroAuto: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: (pagamentoParcialMultaId: string) => Promise<void>;
  onRecusar: (pagamentoParcialMultaId: string) => Promise<void>;
}) {
  const [comprovantes, setComprovantes] = React.useState<Documento[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [processando, setProcessando] = React.useState<"confirmar" | "recusar" | null>(null);

  React.useEffect(() => {
    if (!open || !pagamento) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    listarComprovantesPorPagamentoParcialMulta(pagamento.id)
      .then(setComprovantes)
      .finally(() => setCarregando(false));
  }, [open, pagamento]);

  if (!pagamento) return null;

  async function handleConfirmar() {
    setProcessando("confirmar");
    try {
      await onConfirmar(pagamento!.id);
    } finally {
      setProcessando(null);
    }
  }

  async function handleRecusar() {
    setProcessando("recusar");
    try {
      await onRecusar(pagamento!.id);
    } finally {
      setProcessando(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisar pagamento</DialogTitle>
          <DialogDescription>
            {clienteNome} · Multa {numeroAuto}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor enviado</dt>
            <dd className="font-medium text-gold">{formatCurrency(pagamento.valor)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Forma de pagamento</dt>
            <dd className="font-medium text-foreground">{pagamento.formaPagamento?.toUpperCase() ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Enviado em</dt>
            <dd className="font-medium text-foreground">{formatDateTime(pagamento.enviadoEm)}</dd>
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
