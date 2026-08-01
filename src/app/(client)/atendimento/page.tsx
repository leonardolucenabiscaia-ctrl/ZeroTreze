"use client";

import * as React from "react";
import Link from "next/link";
import { Headset, Plus } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { listarChamadosPorCliente } from "@/lib/services/chamados.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Chamado } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function AtendimentoPage() {
  const { cliente } = useAuth();
  const [chamados, setChamados] = React.useState<Chamado[] | null>(null);

  React.useEffect(() => {
    if (!cliente) return;
    listarChamadosPorCliente(cliente.id).then(setChamados);
  }, [cliente]);

  if (!chamados) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Atendimento</h1>
        <Button asChild size="sm">
          <Link href="/atendimento/novo">
            <Plus className="size-4" />
            Novo chamado
          </Link>
        </Button>
      </div>

      {chamados.length === 0 ? (
        <EmptyState icon={Headset} title="Nenhum chamado aberto" action={
          <Button asChild size="sm">
            <Link href="/atendimento/novo">Abrir chamado</Link>
          </Button>
        } />
      ) : (
        <div className="flex flex-col gap-3">
          {chamados.map((chamado) => (
            <Link key={chamado.id} href={`/atendimento/${chamado.id}`}>
              <Card className="flex-row items-center justify-between gap-3 transition-colors hover:border-gold/40">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{chamado.numero}</span>
                    <Badge variant="outline">{CATEGORIA_LABEL[chamado.categoria]}</Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">{chamado.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    Atualizado {formatDateTime(chamado.atualizadoEm)}
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
