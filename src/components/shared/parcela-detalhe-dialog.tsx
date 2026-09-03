"use client";

import * as React from "react";
import { Banknote, MessageSquareText, Percent, Tag, Ticket } from "lucide-react";

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
import type { BaixaManualParcela, DescontoParcela, ParametrosFinanceiros, Parcela } from "@/lib/types";

export interface DescontoParcelaInput {
  descontarMulta: boolean;
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

const FORMAS_PAGAMENTO_BAIXA: { value: NonNullable<Parcela["formaPagamento"]>; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "outro", label: "Outro" },
];

export interface BaixaManualInput {
  valor: number;
  formaPagamento: NonNullable<Parcela["formaPagamento"]>;
  motivo: string;
}

/** Só faz sentido aplicar desconto ou dar baixa manual sobre parcelas ainda não quitadas, e que
 * não estejam num fluxo especial (aguardando comprovante ou renegociadas num acordo). */
function podeReceberAcaoAdministrativa(parcela: Parcela): boolean {
  return parcela.status === "em_aberto" || parcela.status === "vencido";
}

/** Resumo curto de como foi recebido o pagamento dado baixa manualmente. */
function descreverBaixaManual(baixa: BaixaManualParcela): string {
  return `${formatCurrency(baixa.valor)} recebidos`;
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
  podeDarBaixa = false,
  onDarBaixa,
}: {
  parcela: Parcela | null;
  parametros: ParametrosFinanceiros;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeAplicarDesconto?: boolean;
  onAplicarDesconto?: (parcelaId: string, desconto: DescontoParcelaInput) => Promise<void>;
  podeDarBaixa?: boolean;
  onDarBaixa?: (parcelaId: string, dados: BaixaManualInput) => Promise<void>;
}) {
  const [descontarMulta, setDescontarMulta] = React.useState(false);
  const [percentual, setPercentual] = React.useState("");
  const [valorFixo, setValorFixo] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const [valorBaixa, setValorBaixa] = React.useState("");
  const [formaPagamentoBaixa, setFormaPagamentoBaixa] = React.useState<NonNullable<Parcela["formaPagamento"]>>(
    "dinheiro"
  );
  const [motivoBaixa, setMotivoBaixa] = React.useState("");
  const [salvandoBaixa, setSalvandoBaixa] = React.useState(false);

  React.useEffect(() => {
    if (!parcela) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDescontarMulta(parcela.desconto?.descontarMulta ?? false);
    setPercentual(parcela.desconto?.percentual ? String(parcela.desconto.percentual) : "");
    setValorFixo(parcela.desconto?.valorFixo ? String(parcela.desconto.valorFixo) : "");
    setMotivo(parcela.desconto?.motivo ?? "");
    setValorBaixa(String(calcularValorAtualizado(parcela, parametros).valorFinal));
    setFormaPagamentoBaixa("dinheiro");
    setMotivoBaixa("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const valorBaixaNumero = Number(valorBaixa) || 0;
  const baixaValida = valorBaixaNumero > 0 && motivoBaixa.trim().length > 0;

  async function handleSalvarBaixa() {
    if (!parcela || !onDarBaixa || !baixaValida) return;
    setSalvandoBaixa(true);
    try {
      await onDarBaixa(parcela.id, {
        valor: valorBaixaNumero,
        formaPagamento: formaPagamentoBaixa,
        motivo: motivoBaixa.trim(),
      });
    } finally {
      setSalvandoBaixa(false);
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

        {/* Visível pra qualquer um que abrir esse diálogo — registro de como esse pagamento foi
         * recebido fora do fluxo digital. */}
        {parcela.baixaManual && (
          <div className="flex flex-col gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Banknote className="size-4" />
              Baixa manual — {descreverBaixaManual(parcela.baixaManual)} via{" "}
              {FORMAS_PAGAMENTO_BAIXA.find((f) => f.value === parcela.formaPagamento)?.label ??
                parcela.formaPagamento}
            </p>
            <p className="flex items-start gap-1.5 text-sm text-foreground">
              <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              {parcela.baixaManual.motivo}
            </p>
            <p className="text-xs text-muted-foreground">
              Por {parcela.baixaManual.aplicadoPorNome} em {formatDateTime(parcela.baixaManual.aplicadoEm)}
            </p>
          </div>
        )}

        {podeAplicarDesconto && podeReceberAcaoAdministrativa(parcela) && (
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

        {podeDarBaixa && podeReceberAcaoAdministrativa(parcela) && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Dar baixa manual no pagamento</p>
              <p className="text-xs text-muted-foreground">
                Pra pagamento em dinheiro ou outro meio fora do fluxo de comprovante — marca a parcela como
                paga na hora.
              </p>

              <div className="flex flex-wrap gap-2">
                {FORMAS_PAGAMENTO_BAIXA.map((forma) => (
                  <Button
                    key={forma.value}
                    type="button"
                    size="sm"
                    variant={formaPagamentoBaixa === forma.value ? "default" : "outline"}
                    onClick={() => setFormaPagamentoBaixa(forma.value)}
                  >
                    {forma.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="baixa-valor" className="flex items-center gap-1.5 text-xs">
                  <Banknote className="size-3.5 text-gold" />
                  Valor recebido (R$)
                </Label>
                <Input
                  id="baixa-valor"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  value={valorBaixa}
                  onChange={(e) => setValorBaixa(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="baixa-motivo" className="flex items-center gap-1.5 text-xs">
                  <MessageSquareText className="size-3.5 text-gold" />
                  Como foi recebido <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="baixa-motivo"
                  placeholder="Ex.: pago em dinheiro no escritório"
                  value={motivoBaixa}
                  onChange={(e) => setMotivoBaixa(e.target.value)}
                  rows={2}
                />
              </div>

              <Button onClick={handleSalvarBaixa} disabled={!baixaValida || salvandoBaixa}>
                {salvandoBaixa ? "Salvando…" : "Dar baixa"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
