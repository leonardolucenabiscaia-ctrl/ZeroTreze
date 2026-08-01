"use client";

import * as React from "react";
import Link from "next/link";
import { Headset } from "lucide-react";

import { listarChamados } from "@/lib/services/chamados.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Chamado, Cliente } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { Badge } from "@/components/ui/badge";

const CATEGORIA_LABEL: Record<string, string> = {
  financeiro: "Financeiro",
  manutencao: "Manutenção",
  documentacao: "Documentação",
  acidente: "Acidente",
  troca_veiculo: "Troca de veículo",
  duvidas: "Dúvidas",
};

const PRIORIDADE_VARIANT: Record<string, "neutral" | "warning" | "destructive"> = {
  baixa: "neutral",
  media: "neutral",
  alta: "warning",
  urgente: "destructive",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export default function AdminChamadosPage() {
  const [chamados, setChamados] = React.useState<Chamado[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);

  React.useEffect(() => {
    listarChamados().then(setChamados);
    listarClientes().then(setClientes);
  }, []);

  if (!chamados) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Chamados</h1>

      {chamados.length === 0 ? (
        <EmptyState icon={Headset} title="Nenhum chamado registrado" />
      ) : (
        <div className="flex flex-col gap-3">
          {chamados.map((chamado) => (
            <Link key={chamado.id} href={`/admin/chamados/${chamado.id}`}>
              <Card className="flex-row items-center justify-between transition-colors hover:border-gold/40">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{chamado.numero}</span>
                    <Badge variant="outline">{CATEGORIA_LABEL[chamado.categoria]}</Badge>
                    <Badge variant={PRIORIDADE_VARIANT[chamado.prioridade]}>
                      {PRIORIDADE_LABEL[chamado.prioridade]}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{chamado.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {clientes.find((c) => c.id === chamado.clienteId)?.nome ?? "—"} · Atualizado{" "}
                    {formatDateTime(chamado.atualizadoEm)}
                  </p>
                </div>
                <StatusPill status={chamado.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
