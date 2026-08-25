"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Siren } from "lucide-react";
import { toast } from "sonner";

import { atualizarStatusSolicitacao, listarSolicitacoes } from "@/lib/services/assistencia.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Cliente, SolicitacaoAssistencia } from "@/lib/types";

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

const LABEL_TIPO: Record<string, string> = {
  guincho: "Guincho",
  pane_mecanica: "Pane mecânica",
  pane_eletrica: "Pane elétrica",
  chaveiro: "Chaveiro",
  troca_pneu: "Troca de pneu",
  acidente: "Acidente",
  bateria: "Bateria",
  falta_combustivel: "Falta de combustível",
};

export default function AdminAssistenciaPage() {
  const { usuario } = useAuth();
  const [solicitacoes, setSolicitacoes] = React.useState<SolicitacaoAssistencia[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [resolvendoId, setResolvendoId] = React.useState<string | null>(null);

  React.useEffect(() => {
    listarSolicitacoes().then(setSolicitacoes);
    listarClientes().then(setClientes);
  }, []);

  async function handleResolver(solicitacao: SolicitacaoAssistencia) {
    setResolvendoId(solicitacao.id);
    try {
      const atualizada = await atualizarStatusSolicitacao(solicitacao.id, "concluido");
      setSolicitacoes((atuais) => (atuais ?? []).map((s) => (s.id === atualizada.id ? atualizada : s)));
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Marcou a solicitação de assistência como resolvida",
          entidade: "Assistência 24h",
          entidadeId: solicitacao.protocolo,
        });
      }
      toast.success("Solicitação marcada como resolvida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a solicitação.");
    } finally {
      setResolvendoId(null);
    }
  }

  if (!solicitacoes) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Assistência 24h</h1>

      {solicitacoes.length === 0 ? (
        <EmptyState
          icon={Siren}
          title="Nenhuma solicitação registrada"
          description="Solicitações feitas pelo portal do cliente aparecerão aqui nesta sessão."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocolo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Solicitado em</TableHead>
              <TableHead>Tempo estimado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitacoes.map((s) => {
              const cliente = clientes.find((c) => c.id === s.clienteId);
              const finalizada = s.status === "concluido" || s.status === "cancelado";
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.protocolo}</TableCell>
                  <TableCell>
                    {cliente ? (
                      <Link href={`/admin/clientes/${cliente.id}`} className="text-gold hover:underline">
                        {cliente.nome}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{LABEL_TIPO[s.tipo]}</TableCell>
                  <TableCell>{formatDateTime(s.criadoEm)}</TableCell>
                  <TableCell>{s.tempoEstimadoMin} min</TableCell>
                  <TableCell>
                    <StatusPill status={s.status} />
                  </TableCell>
                  <TableCell>
                    {!finalizada && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolver(s)}
                        disabled={resolvendoId === s.id}
                      >
                        <CheckCircle2 className="size-3.5" />
                        {resolvendoId === s.id ? "Salvando…" : "Resolvido"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
