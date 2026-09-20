"use client";

import * as React from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/shared/file-uploader";
import { gerarPixEstatico } from "@/lib/integrations/pix";
import {
  enviarPagamentoParcial,
  listarPagamentosParciaisPorParcela,
} from "@/lib/services/pagamentos-parciais.service";
import { obterParametrosFinanceiros } from "@/lib/services/financeiro.service";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { EMPRESA } from "@/lib/constants/empresa";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";
import type { PagamentoParcial, ParametrosFinanceiros, Parcela } from "@/lib/types";

// Chave Pix estática da empresa — sempre a mesma, sem valor definido, sem depender de nenhum PSP.
const PIX_ESTATICO = gerarPixEstatico();

const ROTULO_STATUS_ENVIO: Record<PagamentoParcial["status"], string> = {
  aguardando_confirmacao: "Aguardando confirmação",
  confirmado: "Confirmado",
  recusado: "Recusado",
};

export function PagamentoModal({
  parcela,
  open,
  onOpenChange,
  onPago,
}: {
  parcela: Parcela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPago: (pagamento: PagamentoParcial) => void;
}) {
  const [valor, setValor] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [anexos, setAnexos] = React.useState<File[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);
  const [envios, setEnvios] = React.useState<PagamentoParcial[]>([]);

  const valorAtualizado = parcela && parametros ? calcularValorAtualizado(parcela, parametros) : null;

  React.useEffect(() => {
    if (!open) return;
    obterParametrosFinanceiros().then(setParametros);
  }, [open]);

  React.useEffect(() => {
    if (!open || !parcela) return;
    listarPagamentosParciaisPorParcela(parcela.id).then(setEnvios);
  }, [open, parcela]);

  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnexos([]);
  }, [open]);

  React.useEffect(() => {
    if (!valorAtualizado) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValor(String(valorAtualizado.valorFinal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcela?.id, valorAtualizado?.valorFinal]);

  if (!parcela || !valorAtualizado) return null;

  const totalPendente = envios
    .filter((e) => e.status === "aguardando_confirmacao")
    .reduce((soma, e) => soma + e.valor, 0);
  const saldoDisponivel = Math.max(0, valorAtualizado.valorFinal - totalPendente);
  const valorNumero = Number(valor) || 0;
  const valorValido = valorNumero > 0 && valorNumero <= saldoDisponivel + 0.01;

  async function enviarPagamento() {
    setEnviando(true);
    try {
      const pagamento = await enviarPagamentoParcial(parcela!.id, { valor: valorNumero, formaPagamento: "pix" }, anexos);
      toast.success("Pagamento enviado! Aguarde a confirmação do administrador.");
      onPago(pagamento);
      setEnvios((atuais) => [pagamento, ...atuais]);
      setAnexos([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o pagamento.");
    } finally {
      setEnviando(false);
    }
  }

  function copiarChave() {
    navigator.clipboard.writeText(PIX_ESTATICO);
    toast.success("Chave Pix copiada.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar parcela {parcela.numero}</DialogTitle>
          <DialogDescription>
            Vencimento em {formatDate(parcela.dataVencimento)} — saldo em aberto{" "}
            <span className="font-medium text-gold">{formatCurrency(valorAtualizado.valorFinal)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-sm text-foreground">
            Pix para <span className="font-medium">Zero Treze Transportes Ltda</span> — CNPJ {EMPRESA.cnpj}
          </p>
          <Button variant="outline" size="sm" onClick={copiarChave} className="self-start">
            <Copy className="size-4" />
            Copiar chave PIX
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Pode pagar aos poucos ao longo da semana — cada valor enviado é conferido separadamente. Diga
          abaixo quanto você está pagando agora.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="valor-pago">Valor que você está pagando agora (R$)</Label>
          <Input
            id="valor-pago"
            type="number"
            min={0}
            max={saldoDisponivel}
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Saldo disponível pra pagar agora: {formatCurrency(saldoDisponivel)}
            {totalPendente > 0 && ` (já descontando ${formatCurrency(totalPendente)} aguardando confirmação)`}
          </p>
        </div>

        <FileUploader
          arquivos={anexos}
          onChange={setAnexos}
          label="Comprovante de pagamento (opcional)"
          hint="Anexe o print ou PDF do comprovante — ajuda a agilizar a confirmação"
        />

        <Button className="w-full" onClick={enviarPagamento} disabled={!valorValido || enviando}>
          {enviando ? "Enviando…" : "Enviar pagamento"}
        </Button>

        {envios.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Pagamentos enviados desta parcela</span>
            <ul className="flex flex-col gap-1.5">
              {envios.map((envio) => (
                <li
                  key={envio.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{formatCurrency(envio.valor)}</span>
                  <span className="text-xs text-muted-foreground">
                    {ROTULO_STATUS_ENVIO[envio.status]} · {formatDateTime(envio.enviadoEm)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <p className="text-xs text-muted-foreground">
            Cada envio fica em análise até o administrador confirmar o recebimento na conta bancária. Você
            será avisado assim que for confirmado.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
