"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/shared/file-uploader";
import { gerarPixEstatico } from "@/lib/integrations/pix";
import { enviarComprovantePagamento, obterParametrosFinanceiros } from "@/lib/services/financeiro.service";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { EMPRESA } from "@/lib/constants/empresa";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { ParametrosFinanceiros, Parcela } from "@/lib/types";

// Chave Pix estática da empresa — sempre a mesma, sem valor definido, sem depender de nenhum PSP.
const PIX_ESTATICO = gerarPixEstatico();

export function PagamentoModal({
  parcela,
  open,
  onOpenChange,
  onPago,
}: {
  parcela: Parcela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPago: (parcela: Parcela) => void;
}) {
  const [confirmando, setConfirmando] = React.useState(false);
  const [anexos, setAnexos] = React.useState<File[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);

  const valorAtualizado = parcela && parametros ? calcularValorAtualizado(parcela, parametros) : null;

  React.useEffect(() => {
    if (!open) return;
    obterParametrosFinanceiros().then(setParametros);
  }, [open]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setAnexos([]);
  }, [open]);

  if (!parcela || !valorAtualizado) return null;

  async function enviarComprovante() {
    setConfirmando(true);
    try {
      const atualizada = await enviarComprovantePagamento(parcela!.id, "pix", anexos);
      toast.success("Comprovante enviado! Aguarde a confirmação do pagamento pelo administrador.");
      onPago(atualizada);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o comprovante.");
    } finally {
      setConfirmando(false);
    }
  }

  function copiarChave() {
    navigator.clipboard.writeText(PIX_ESTATICO);
    toast.success("Código PIX copiado.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar parcela {parcela.numero}</DialogTitle>
          <DialogDescription>
            Vencimento em {formatDate(parcela.dataVencimento)} — valor atualizado{" "}
            <span className="font-medium text-gold">{formatCurrency(valorAtualizado.valorFinal)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={PIX_ESTATICO} size={180} />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Pix para Zero Treze Transportes Ltda — CNPJ {EMPRESA.cnpj}. Ao escanear ou colar a chave, digite
            você mesmo o valor de{" "}
            <span className="font-medium text-gold">{formatCurrency(valorAtualizado.valorFinal)}</span> no seu
            banco.
          </p>
          <Button variant="outline" size="sm" onClick={copiarChave}>
            <Copy className="size-4" />
            Copiar chave PIX
          </Button>
          <Button className="w-full" onClick={enviarComprovante} disabled={confirmando}>
            {confirmando ? "Enviando…" : "Já paguei via PIX"}
          </Button>
        </div>

        <FileUploader
          arquivos={anexos}
          onChange={setAnexos}
          label="Comprovante de pagamento (opcional)"
          hint="Anexe o print ou PDF do comprovante — ajuda a agilizar a confirmação"
        />

        <DialogFooter>
          <p className="text-xs text-muted-foreground">
            Após o envio, o pagamento fica em análise até o administrador confirmar o recebimento na conta
            bancária. Você será avisado assim que for confirmado.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
