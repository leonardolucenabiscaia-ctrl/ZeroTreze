"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/shared/file-uploader";
import { pixProvider } from "@/lib/integrations/pix";
import { boletoProvider } from "@/lib/integrations/boleto";
import { enviarComprovantePagamentoAcordo } from "@/lib/services/financeiro-acordos.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { ParcelaAcordo } from "@/lib/types";

/** Mesmo fluxo do `PagamentoModal` das parcelas de contrato, mas sem juros/multa/correção — a
 * parcela do acordo já é um valor fixo negociado, não acumula mais nada. */
export function PagamentoAcordoModal({
  parcela,
  open,
  onOpenChange,
  onPago,
}: {
  parcela: ParcelaAcordo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPago: (parcela: ParcelaAcordo) => void;
}) {
  const [copiaECola, setCopiaECola] = React.useState("");
  const [linhaDigitavel, setLinhaDigitavel] = React.useState("");
  const [urlBoleto, setUrlBoleto] = React.useState("");
  const [confirmando, setConfirmando] = React.useState<"pix" | "boleto" | null>(null);
  const [anexos, setAnexos] = React.useState<File[]>([]);

  React.useEffect(() => {
    if (!open || !parcela) return;
    pixProvider.gerarCobranca(parcela.valor, parcela.id).then((c) => setCopiaECola(c.copiaECola));
    boletoProvider
      .gerarBoleto(parcela.valor, parcela.vencimento, parcela.id)
      .then((b) => {
        setLinhaDigitavel(b.linhaDigitavel);
        setUrlBoleto(b.urlPdf);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parcela?.id]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setAnexos([]);
  }, [open]);

  if (!parcela) return null;

  async function enviarComprovante(forma: "pix" | "boleto") {
    setConfirmando(forma);
    try {
      const atualizada = await enviarComprovantePagamentoAcordo(parcela!.id, forma, anexos);
      toast.success("Comprovante enviado! Aguarde a confirmação do pagamento pelo administrador.");
      onPago(atualizada);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o comprovante.");
    } finally {
      setConfirmando(null);
    }
  }

  function copiarChave() {
    navigator.clipboard.writeText(copiaECola);
    toast.success("Código PIX copiado.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar parcela {parcela.numero} do acordo</DialogTitle>
          <DialogDescription>
            Vencimento em {formatDate(parcela.vencimento)} — valor{" "}
            <span className="font-medium text-gold">{formatCurrency(parcela.valor)}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pix">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pix">PIX</TabsTrigger>
            <TabsTrigger value="boleto">Boleto</TabsTrigger>
          </TabsList>

          <TabsContent value="pix" className="flex flex-col items-center gap-4">
            {copiaECola ? (
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={copiaECola} size={180} />
              </div>
            ) : (
              <div className="flex h-[204px] w-[204px] items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={copiarChave} disabled={!copiaECola}>
              <Copy className="size-4" />
              Copiar chave PIX
            </Button>
            <Button
              className="w-full"
              onClick={() => enviarComprovante("pix")}
              disabled={confirmando !== null}
            >
              {confirmando === "pix" ? "Enviando…" : "Já paguei via PIX"}
            </Button>
          </TabsContent>

          <TabsContent value="boleto" className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-center text-sm font-mono text-foreground">
              {linhaDigitavel || "Gerando linha digitável…"}
            </div>
            <Button variant="outline" size="sm" asChild disabled={!urlBoleto}>
              <a href={urlBoleto || "#"} download>
                <Download className="size-4" />
                Baixar boleto em PDF
              </a>
            </Button>
            <Button
              className="w-full"
              onClick={() => enviarComprovante("boleto")}
              disabled={confirmando !== null}
            >
              {confirmando === "boleto" ? "Enviando…" : "Já paguei o boleto"}
            </Button>
          </TabsContent>
        </Tabs>

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
