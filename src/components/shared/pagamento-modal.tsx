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
import { enviarComprovantePagamento, obterParametrosFinanceiros } from "@/lib/services/financeiro.service";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { ParametrosFinanceiros, Parcela } from "@/lib/types";

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
  const [copiaECola, setCopiaECola] = React.useState("");
  const [linhaDigitavel, setLinhaDigitavel] = React.useState("");
  const [urlBoleto, setUrlBoleto] = React.useState("");
  const [confirmando, setConfirmando] = React.useState<"pix" | "boleto" | null>(null);
  const [anexos, setAnexos] = React.useState<File[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);

  const valorAtualizado = parcela && parametros ? calcularValorAtualizado(parcela, parametros) : null;

  React.useEffect(() => {
    if (!open) return;
    obterParametrosFinanceiros().then(setParametros);
  }, [open]);

  React.useEffect(() => {
    if (!open || !parcela || !valorAtualizado) return;
    pixProvider.gerarCobranca(valorAtualizado.valorFinal, parcela.id).then((c) => setCopiaECola(c.copiaECola));
    boletoProvider
      .gerarBoleto(valorAtualizado.valorFinal, parcela.dataVencimento, parcela.id)
      .then((b) => {
        setLinhaDigitavel(b.linhaDigitavel);
        setUrlBoleto(b.urlPdf);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parcela?.id, valorAtualizado?.valorFinal]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setAnexos([]);
  }, [open]);

  if (!parcela || !valorAtualizado) return null;

  async function enviarComprovante(forma: "pix" | "boleto") {
    setConfirmando(forma);
    try {
      const atualizada = await enviarComprovantePagamento(parcela!.id, forma, anexos);
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
          <DialogTitle>Pagar parcela {parcela.numero}</DialogTitle>
          <DialogDescription>
            Vencimento em {formatDate(parcela.dataVencimento)} — valor atualizado{" "}
            <span className="font-medium text-gold">{formatCurrency(valorAtualizado.valorFinal)}</span>
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
