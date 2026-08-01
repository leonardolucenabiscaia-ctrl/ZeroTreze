"use client";

import * as React from "react";
import { Wallet } from "lucide-react";

import { useContratoAtivo } from "@/hooks/use-contrato-ativo";
import { useParametrosFinanceiros } from "@/hooks/use-parametros-financeiros";
import { listarParcelasPorContrato } from "@/lib/services/financeiro.service";
import type { Parcela, StatusParcela } from "@/lib/types";

import { ParcelasTable } from "@/components/shared/parcelas-table";
import { PagamentoModal } from "@/components/shared/pagamento-modal";
import { ParcelaDetalheDialog } from "@/components/shared/parcela-detalhe-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Filtro = "todos" | StatusParcela;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pago", label: "Pago" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "vencido", label: "Vencido" },
  { value: "aguardando_confirmacao", label: "Aguardando confirmação" },
];

export default function FinanceiroPage() {
  const { contrato, loading } = useContratoAtivo();
  const parametros = useParametrosFinanceiros();
  const [parcelas, setParcelas] = React.useState<Parcela[]>([]);
  const [filtro, setFiltro] = React.useState<Filtro>("todos");
  const [parcelaPagamento, setParcelaPagamento] = React.useState<Parcela | null>(null);
  const [parcelaDetalhe, setParcelaDetalhe] = React.useState<Parcela | null>(null);

  React.useEffect(() => {
    if (!contrato) return;
    listarParcelasPorContrato(contrato.id).then(setParcelas);
  }, [contrato]);

  function handlePago() {
    // Recarrega a lista completa após o envio do comprovante (fica aguardando confirmação).
    if (contrato) listarParcelasPorContrato(contrato.id).then(setParcelas);
  }

  const parcelasFiltradas =
    filtro === "todos" ? parcelas : parcelas.filter((p) => p.status === filtro);

  if (loading || !parametros) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!contrato) {
    return (
      <EmptyState icon={Wallet} title="Nenhum contrato ativo" description="Não há parcelas para exibir." />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Contrato {contrato.numero} · parcelas semanais, vencimento toda segunda-feira até 23h59
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filtro === f.value ? "default" : "outline"}
            onClick={() => setFiltro(f.value)}
            className={cn(filtro === f.value && "shadow-none")}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {parcelasFiltradas.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma parcela encontrada" description="Ajuste os filtros para ver outras parcelas." />
      ) : (
        <ParcelasTable
          parcelas={parcelasFiltradas}
          parametros={parametros}
          variant="cliente"
          onPagar={setParcelaPagamento}
          onVisualizar={setParcelaDetalhe}
        />
      )}

      <PagamentoModal
        parcela={parcelaPagamento}
        open={parcelaPagamento !== null}
        onOpenChange={(open) => !open && setParcelaPagamento(null)}
        onPago={handlePago}
      />
      <ParcelaDetalheDialog
        parcela={parcelaDetalhe}
        parametros={parametros}
        open={parcelaDetalhe !== null}
        onOpenChange={(open) => !open && setParcelaDetalhe(null)}
      />
    </div>
  );
}
