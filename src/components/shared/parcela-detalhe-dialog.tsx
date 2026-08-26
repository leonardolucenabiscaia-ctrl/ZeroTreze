"use client";

import * as React from "react";
import { MessageSquareText, Percent, Tag, Ticket } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "./status-pill";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils/formatters";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import type { DescontoParcela, ParametrosFinanceiros, Parcela } from "@/lib/types";

export interface DescontoParcelaInput {
  descontarMulta: boolean;
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

/** Só faz sentido aplicar desconto sobre parcelas ainda não quitadas. */
function podeReceberDesconto(parcela: Parcela): boolean {
  return parcela.status === "em_aberto" || parcela.status === "vencido";
}

/** Resumo curto do que foi descontado, pra exibir junto do motivo. */
function descreverDesconto(desconto: DescontoParcela): string {
  const partes: string[] = [];
  if (desconto.descontarMulta) partes.push("100% da multa");
  if (desconto.percentual) partes.push(`${desconto.percentual}% do valor`);
  if (desconto.valorFixo) partes.push(formatCurrency(desconto.valorFixo));
  return partes.join(" + ") || "Desconto aplicado";
}

export function ParcelaDetalheDialog({
  parcela,
  parametros,
  open,
  onOpenChange,
  podeAplicarDesconto = false,
  onAplicarDesconto,
}: {
  parcela: Parcela | null;
  parametros: ParametrosFinanceiros;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeAplicarDesconto?: boolean;
  onAplicarDesconto?: (parcelaId: string, desconto: DescontoParcelaInput) => Promise<void>;
}) {
  const [descontarMulta, setDescontarMulta] = React.useState(false);
  const [percentual, setPercentual] = React.useState("");
  const [valorFixo, setValorFixo] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    if (!parcela) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDescontarMulta(parcela.desconto?.descontarMulta ?? false);
    setPercentual(parcela.desconto?.percentual ? String(parcela.desconto.percentual) : "");
    setValorFixo(parcela.desconto?.valorFixo ? String(parcela.desconto.valorFixo) : "");
    setMotivo(parcela.desconto?.motivo ?? "");
  }, [parcela]);

  if (!parcela) return null;

  const atualizado = calcularValorAtualizado(parcela, parametros);

  const linhas: [string, string][] = [
    ["Número", String(parcela.numero)],
    ["Competência", parcela.competencia],
    ["Valor original", formatCurrency(parcela.valorOriginal)],
    ["Juros", formatCurrency(atualizado.juros)],
    ["Multa", formatCurrency(atualizado.multa)],
    ["Correção monetária", formatCurrency(atualizado.correcao)],
    ["Valor atualizado", formatCurrency(atualizado.valorFinal)],
    ["Dias em atraso", String(atualizado.diasAtraso)],
    ["Vencimento", formatDate(parcela.dataVencimento)],
    ["Comprovante enviado", parcela.dataEnvioComprovante ? formatDate(parcela.dataEnvioComprovante) : "—"],
    ["Pagamento confirmado", parcela.dataPagamento ? formatDate(parcela.dataPagamento) : "—"],
    ["Forma de pagamento", parcela.formaPagamento?.toUpperCase() ?? "—"],
  ];

  const percentualNumero = Number(percentual) || 0;
  const valorFixoNumero = Number(valorFixo) || 0;
  const draftDesconto: DescontoParcela = {
    descontarMulta,
    percentual: percentualNumero || undefined,
    valorFixo: valorFixoNumero || undefined,
    aplicadoPorNome: "",
    aplicadoEm: "",
  };
  const previa = calcularValorAtualizado({ ...parcela, desconto: draftDesconto }, parametros);

  const haveraDesconto = descontarMulta || !!percentualNumero || !!valorFixoNumero;
  const houveAlteracao =
    descontarMulta !== (parcela.desconto?.descontarMulta ?? false) ||
    percentualNumero !== (parcela.desconto?.percentual ?? 0) ||
    valorFixoNumero !== (parcela.desconto?.valorFixo ?? 0) ||
    motivo.trim() !== (parcela.desconto?.motivo ?? "");

  async function handleSalvar() {
    if (!parcela || !onAplicarDesconto) return;
    setSalvando(true);
    try {
      await onAplicarDesconto(parcela.id, {
        descontarMulta,
        percentual: percentualNumero || undefined,
        valorFixo: valorFixoNumero || undefined,
        motivo: motivo.trim() || undefined,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Parcela {parcela.numero}
            <StatusPill status={parcela.status} />
          </DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {linhas.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Visível pra qualquer um que abrir esse diálogo — inclusive o cliente que recebeu o
         * desconto, não só quem tem permissão de aplicar um novo. */}
        {parcela.desconto && (
          <div className="flex flex-col gap-1 rounded-lg border border-gold/30 bg-gold-muted px-3 py-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-gold">
              <Ticket className="size-4" />
              Desconto aplicado — {descreverDesconto(parcela.desconto)}
            </p>
            {parcela.desconto.motivo && (
              <p className="flex items-start gap-1.5 text-sm text-foreground">
                <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                {parcela.desconto.motivo}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Por {parcela.desconto.aplicadoPorNome} em {formatDateTime(parcela.desconto.aplicadoEm)}
            </p>
          </div>
        )}

        {podeAplicarDesconto && podeReceberDesconto(parcela) && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">
                {parcela.desconto ? "Editar desconto" : "Aplicar desconto"}
              </p>

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <Label htmlFor="desconto-multa" className="flex items-center gap-2 text-sm font-normal">
                  <Ticket className="size-4 text-gold" />
                  Desconto da multa (100% off)
                </Label>
                <Switch id="desconto-multa" checked={descontarMulta} onCheckedChange={setDescontarMulta} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="desconto-percentual" className="flex items-center gap-1.5 text-xs">
                    <Percent className="size-3.5 text-gold" />
                    Desconto de porcentagem
                  </Label>
                  <Input
                    id="desconto-percentual"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    placeholder="0"
                    value={percentual}
                    onChange={(e) => setPercentual(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="desconto-valor" className="flex items-center gap-1.5 text-xs">
                    <Tag className="size-3.5 text-gold" />
                    Desconto de valor (R$)
                  </Label>
                  <Input
                    id="desconto-valor"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    value={valorFixo}
                    onChange={(e) => setValorFixo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="desconto-motivo" className="flex items-center gap-1.5 text-xs">
                  <MessageSquareText className="size-3.5 text-gold" />
                  Motivo do desconto {haveraDesconto && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="desconto-motivo"
                  placeholder="Explique o motivo — o cliente também vai ver essa explicação."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Novo valor atualizado: </span>
                <span className="font-medium text-gold">{formatCurrency(previa.valorFinal)}</span>
              </div>

              <Button
                onClick={handleSalvar}
                disabled={!houveAlteracao || salvando || (haveraDesconto && !motivo.trim())}
              >
                {salvando ? "Salvando…" : "Salvar desconto"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
