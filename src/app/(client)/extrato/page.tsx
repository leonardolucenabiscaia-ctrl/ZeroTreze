"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Printer, Receipt, Sheet as SheetIcon } from "lucide-react";
import { toast } from "sonner";

import { useContratoAtivo } from "@/hooks/use-contrato-ativo";
import { listarExtratoPorContrato } from "@/lib/services/financeiro.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { MovimentoExtrato, TipoMovimentoExtrato } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Filtro = "todos" | TipoMovimentoExtrato;

export default function ExtratoPage() {
  const { contrato, loading } = useContratoAtivo();
  const [movimentos, setMovimentos] = React.useState<MovimentoExtrato[]>([]);
  const [filtro, setFiltro] = React.useState<Filtro>("todos");

  React.useEffect(() => {
    if (!contrato) return;
    listarExtratoPorContrato(contrato.id).then(setMovimentos);
  }, [contrato]);

  function exportar(tipo: string) {
    toast.success(`Extrato exportado em ${tipo}.`);
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!contrato) {
    return <EmptyState icon={Receipt} title="Nenhum contrato ativo" />;
  }

  const filtrados = filtro === "todos" ? movimentos : movimentos.filter((m) => m.tipo === filtro);
  const saldoAtual = movimentos[0]?.saldo ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Extrato financeiro</h1>
          <p className="text-sm text-muted-foreground">Contrato {contrato.numero}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportar("PDF")}>
            Exportar PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportar("Excel")}>
            <SheetIcon className="size-4" />
            Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <Card className="flex-row items-center justify-between">
        <span className="text-sm text-muted-foreground">Saldo total movimentado</span>
        <span className="text-2xl font-semibold text-gold">{formatCurrency(saldoAtual)}</span>
      </Card>

      <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os tipos</SelectItem>
          <SelectItem value="entrada">Entradas</SelectItem>
          <SelectItem value="saida">Saídas</SelectItem>
        </SelectContent>
      </Select>

      {filtrados.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma movimentação encontrada" />
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {filtrados.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-8 items-center justify-center rounded-full ${
                    m.tipo === "entrada" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {m.tipo === "entrada" ? (
                    <ArrowDownLeft className="size-4" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.descricao}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.data, "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${m.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
                  {m.tipo === "entrada" ? "+" : "-"}
                  {formatCurrency(m.valor)}
                </p>
                <p className="text-xs text-muted-foreground">Saldo {formatCurrency(m.saldo)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
