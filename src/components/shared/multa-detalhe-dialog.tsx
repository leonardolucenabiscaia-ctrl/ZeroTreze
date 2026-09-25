"use client";

import * as React from "react";
import { Banknote, MessageSquareText, Percent, Tag, Ticket } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "./status-pill";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils/formatters";
import { calcularValorAtualizadoMulta } from "@/lib/calculations/multa";
import type { BaixaManualMulta, DescontoMulta, Multa } from "@/lib/types";

export interface DescontoMultaInput {
  percentual?: number;
  valorFixo?: number;
  motivo?: string;
}

const FORMAS_PAGAMENTO_BAIXA: { value: NonNullable<Multa["formaPagamento"]>; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "outro", label: "Outro" },
];

export interface BaixaManualMultaInput {
  valor: number;
  formaPagamento: NonNullable<Multa["formaPagamento"]>;
  motivo: string;
}

/** Só faz sentido aplicar desconto ou dar baixa manual sobre multas ainda não pagas. */
function podeReceberAcaoAdministrativa(multa: Multa): boolean {
  return multa.situacao !== "paga";
}

function descreverBaixaManual(baixa: BaixaManualMulta): string {
  return `${formatCurrency(baixa.valor)} recebidos`;
}

function descreverDesconto(desconto: DescontoMulta): string {
  const partes: string[] = [];
  if (desconto.percentual) partes.push(`${desconto.percentual}% do valor`);
  if (desconto.valorFixo) partes.push(formatCurrency(desconto.valorFixo));
  return partes.join(" + ") || "Desconto aplicado";
}

export function MultaDetalheDialog({
  multa,
  open,
  onOpenChange,
  podeAplicarDesconto = false,
  onAplicarDesconto,
  podeDarBaixa = false,
  onDarBaixa,
}: {
  multa: Multa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeAplicarDesconto?: boolean;
  onAplicarDesconto?: (multaId: string, desconto: DescontoMultaInput) => Promise<void>;
  podeDarBaixa?: boolean;
  onDarBaixa?: (multaId: string, dados: BaixaManualMultaInput) => Promise<void>;
}) {
  const [percentual, setPercentual] = React.useState("");
  const [valorFixo, setValorFixo] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const [valorBaixa, setValorBaixa] = React.useState("");
  const [formaPagamentoBaixa, setFormaPagamentoBaixa] =
    React.useState<NonNullable<Multa["formaPagamento"]>>("dinheiro");
  const [motivoBaixa, setMotivoBaixa] = React.useState("");
  const [salvandoBaixa, setSalvandoBaixa] = React.useState(false);

  React.useEffect(() => {
    if (!multa) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPercentual(multa.desconto?.percentual ? String(multa.desconto.percentual) : "");
    setValorFixo(multa.desconto?.valorFixo ? String(multa.desconto.valorFixo) : "");
    setMotivo(multa.desconto?.motivo ?? "");
    setValorBaixa(String(calcularValorAtualizadoMulta(multa)));
    setFormaPagamentoBaixa("dinheiro");
    setMotivoBaixa("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multa]);

  if (!multa) return null;

  const valorAtual = calcularValorAtualizadoMulta(multa);

  const linhas: [string, string][] = [
    ["Auto", multa.numeroAuto],
    ["Órgão", multa.orgao],
    ["Descrição", multa.descricao],
    ["Valor original", formatCurrency(multa.valor)],
    ["Valor atual", formatCurrency(valorAtual)],
    ["Pontos", String(multa.pontos)],
    ["Vencimento", formatDate(multa.vencimento)],
    ["Ciência do cliente", multa.cienciaEm ? formatDateTime(multa.cienciaEm) : "—"],
  ];

  const percentualNumero = Number(percentual) || 0;
  const valorFixoNumero = Number(valorFixo) || 0;
  const previaValor = calcularValorAtualizadoMulta({
    valor: multa.valor,
    desconto: {
      percentual: percentualNumero || undefined,
      valorFixo: valorFixoNumero || undefined,
    },
  });

  const haveraDesconto = !!percentualNumero || !!valorFixoNumero;
  const houveAlteracao =
    percentualNumero !== (multa.desconto?.percentual ?? 0) ||
    valorFixoNumero !== (multa.desconto?.valorFixo ?? 0) ||
    motivo.trim() !== (multa.desconto?.motivo ?? "");

  async function handleSalvar() {
    if (!multa || !onAplicarDesconto) return;
    setSalvando(true);
    try {
      await onAplicarDesconto(multa.id, {
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
    if (!multa || !onDarBaixa || !baixaValida) return;
    setSalvandoBaixa(true);
    try {
      await onDarBaixa(multa.id, {
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
            Multa {multa.numeroAuto}
            <StatusPill status={multa.situacao} />
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

        {multa.desconto && (
          <div className="flex flex-col gap-1 rounded-lg border border-gold/30 bg-gold-muted px-3 py-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-gold">
              <Ticket className="size-4" />
              Desconto aplicado — {descreverDesconto(multa.desconto)}
            </p>
            {multa.desconto.motivo && (
              <p className="flex items-start gap-1.5 text-sm text-foreground">
                <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                {multa.desconto.motivo}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Por {multa.desconto.aplicadoPorNome} em {formatDateTime(multa.desconto.aplicadoEm)}
            </p>
          </div>
        )}

        {multa.baixaManual && (
          <div className="flex flex-col gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Banknote className="size-4" />
              Baixa manual — {descreverBaixaManual(multa.baixaManual)} via{" "}
              {FORMAS_PAGAMENTO_BAIXA.find((f) => f.value === multa.formaPagamento)?.label ??
                multa.formaPagamento}
            </p>
            <p className="flex items-start gap-1.5 text-sm text-foreground">
              <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              {multa.baixaManual.motivo}
            </p>
            <p className="text-xs text-muted-foreground">
              Por {multa.baixaManual.aplicadoPorNome} em {formatDateTime(multa.baixaManual.aplicadoEm)}
            </p>
          </div>
        )}

        {podeAplicarDesconto && podeReceberAcaoAdministrativa(multa) && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">
                {multa.desconto ? "Editar desconto" : "Aplicar desconto"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="desconto-multa-percentual" className="flex items-center gap-1.5 text-xs">
                    <Percent className="size-3.5 text-gold" />
                    Desconto de porcentagem
                  </Label>
                  <Input
                    id="desconto-multa-percentual"
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
                  <Label htmlFor="desconto-multa-valor" className="flex items-center gap-1.5 text-xs">
                    <Tag className="size-3.5 text-gold" />
                    Desconto de valor (R$)
                  </Label>
                  <Input
                    id="desconto-multa-valor"
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
                <Label htmlFor="desconto-multa-motivo" className="flex items-center gap-1.5 text-xs">
                  <MessageSquareText className="size-3.5 text-gold" />
                  Motivo do desconto {haveraDesconto && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="desconto-multa-motivo"
                  placeholder="Explique o motivo — o cliente também vai ver essa explicação."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Novo valor: </span>
                <span className="font-medium text-gold">{formatCurrency(previaValor)}</span>
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

        {podeDarBaixa && podeReceberAcaoAdministrativa(multa) && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Dar baixa manual no pagamento</p>
              <p className="text-xs text-muted-foreground">
                Pra pagamento em dinheiro ou outro meio fora do fluxo de comprovante — marca a multa como
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
                <Label htmlFor="baixa-multa-valor" className="flex items-center gap-1.5 text-xs">
                  <Banknote className="size-3.5 text-gold" />
                  Valor recebido (R$)
                </Label>
                <Input
                  id="baixa-multa-valor"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  value={valorBaixa}
                  onChange={(e) => setValorBaixa(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="baixa-multa-motivo" className="flex items-center gap-1.5 text-xs">
                  <MessageSquareText className="size-3.5 text-gold" />
                  Como foi recebido <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="baixa-multa-motivo"
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
