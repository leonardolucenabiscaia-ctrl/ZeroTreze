"use client";

import * as React from "react";
import { Handshake } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { listarAcordosPorCliente } from "@/lib/services/acordos.service";
import type { Acordo, ParcelaAcordo, StatusParcelaAcordo } from "@/lib/types";

import { ParcelasAcordoTable } from "@/components/shared/parcelas-acordo-table";
import { PagamentoAcordoModal } from "@/components/shared/pagamento-acordo-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Filtro = "todos" | StatusParcelaAcordo;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pago", label: "Pago" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "vencido", label: "Vencido" },
  { value: "aguardando_confirmacao", label: "Aguardando confirmação" },
];

interface LinhaParcelaAcordo {
  parcela: ParcelaAcordo;
  acordoNumero: string;
}

export default function FinanceiroAcordosPage() {
  const { cliente } = useAuth();
  const [acordos, setAcordos] = React.useState<Acordo[] | null>(null);
  const [filtro, setFiltro] = React.useState<Filtro>("todos");
  const [parcelaPagamento, setParcelaPagamento] = React.useState<ParcelaAcordo | null>(null);

  const carregar = React.useCallback(() => {
    if (!cliente) return;
    listarAcordosPorCliente(cliente.id).then(setAcordos);
  }, [cliente]);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  if (!acordos) return <Skeleton className="h-96 w-full" />;

  const linhas: LinhaParcelaAcordo[] = acordos.flatMap((acordo) =>
    acordo.cronograma.map((parcela) => ({ parcela, acordoNumero: acordo.numero }))
  );
  const linhasFiltradas = filtro === "todos" ? linhas : linhas.filter((l) => l.parcela.status === filtro);

  if (acordos.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="Nenhum acordo encontrado"
        description="Parcelas de acordos de renegociação aparecerão aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Financeiro Acordos</h1>
        <p className="text-sm text-muted-foreground">Parcelas dos seus acordos de renegociação.</p>
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

      {linhasFiltradas.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Nenhuma parcela encontrada"
          description="Ajuste os filtros para ver outras parcelas."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {acordos.map((acordo) => {
            const parcelasDoAcordo = acordo.cronograma.filter(
              (p) => filtro === "todos" || p.status === filtro
            );
            if (parcelasDoAcordo.length === 0) return null;
            return (
              <div key={acordo.id} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">
                  Acordo {acordo.numero}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({acordo.periodicidade === "semanal" ? "parcelas semanais" : "parcelas mensais"})
                  </span>
                </p>
                <ParcelasAcordoTable parcelas={parcelasDoAcordo} onPagar={setParcelaPagamento} />
              </div>
            );
          })}
        </div>
      )}

      <PagamentoAcordoModal
        parcela={parcelaPagamento}
        open={parcelaPagamento !== null}
        onOpenChange={(open) => !open && setParcelaPagamento(null)}
        onPago={() => {
          setParcelaPagamento(null);
          carregar();
        }}
      />
    </div>
  );
}
