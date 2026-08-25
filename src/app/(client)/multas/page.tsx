"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useContratoAtivo } from "@/hooks/use-contrato-ativo";
import { listarMultasPorContrato, pagarMulta } from "@/lib/services/multas.service";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";
import type { Multa, StatusMulta } from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { SelectBusca } from "@/components/ui/select-busca";

type Filtro = "todas" | StatusMulta;

export default function MultasPage() {
  const { contrato, loading } = useContratoAtivo();
  const [multas, setMultas] = React.useState<Multa[]>([]);
  const [filtro, setFiltro] = React.useState<Filtro>("todas");

  React.useEffect(() => {
    if (!contrato) return;
    listarMultasPorContrato(contrato.id).then(setMultas);
  }, [contrato]);

  async function handlePagar(multa: Multa) {
    const atualizada = await pagarMulta(multa.id);
    setMultas((atuais) => atuais.map((m) => (m.id === atualizada.id ? atualizada : m)));
    toast.success("Multa paga com sucesso.");
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!contrato) return <EmptyState icon={AlertTriangle} title="Nenhum contrato ativo" />;

  const filtradas = filtro === "todas" ? multas : multas.filter((m) => m.situacao === filtro);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Multas de trânsito</h1>
        <SelectBusca
          value={filtro}
          onValueChange={(v) => setFiltro(v as Filtro)}
          placeholder="Situação"
          searchPlaceholder="Buscar situação…"
          className="w-44"
          options={[
            { value: "todas", label: "Todas" },
            { value: "pendente", label: "Pendente" },
            { value: "paga", label: "Paga" },
            { value: "vencida", label: "Vencida" },
            { value: "recorrida", label: "Recorrida" },
          ]}
        />
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Nenhuma multa encontrada" description="Ótimo, seu histórico está limpo por aqui." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auto</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Ciência</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((multa) => (
              <TableRow key={multa.id}>
                <TableCell className="font-mono text-xs">{multa.numeroAuto}</TableCell>
                <TableCell>{multa.orgao}</TableCell>
                <TableCell>{formatDate(multa.data)}</TableCell>
                <TableCell className="max-w-56 truncate">{multa.descricao}</TableCell>
                <TableCell>{formatCurrency(multa.valor)}</TableCell>
                <TableCell>{multa.pontos}</TableCell>
                <TableCell>{formatDate(multa.vencimento)}</TableCell>
                <TableCell>
                  <StatusPill status={multa.situacao} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {multa.cienciaEm ? formatDateTime(multa.cienciaEm) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {multa.situacao !== "paga" && (
                    <Button size="sm" onClick={() => handlePagar(multa)}>
                      Pagar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
