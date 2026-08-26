"use client";

import * as React from "react";
import { Wallet, Clock } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { listarAcordos } from "@/lib/services/acordos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { confirmarPagamentoAcordo, recusarPagamentoAcordo } from "@/lib/services/financeiro-acordos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Acordo, Cliente, ParcelaAcordo, StatusParcelaAcordo } from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelectBusca } from "@/components/ui/select-busca";
import { StatCard } from "@/components/shared/stat-card";
import { StatusPill } from "@/components/shared/status-pill";
import { RevisarPagamentoAcordoDialog } from "@/components/shared/revisar-pagamento-acordo-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

type Filtro = "todos" | StatusParcelaAcordo;
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "aguardando_confirmacao", label: "Aguardando confirmação" },
  { value: "pago", label: "Pago" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "vencido", label: "Vencido" },
];

const TODOS = "todos";

interface LinhaParcelaAcordo {
  parcela: ParcelaAcordo;
  clienteId: string;
  clienteNome: string;
  acordoNumero: string;
}

export default function AdminFinanceiroAcordosPage() {
  const { usuario } = useAuth();
  const [linhas, setLinhas] = React.useState<LinhaParcelaAcordo[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [filtro, setFiltro] = React.useState<Filtro>("todos");
  const [filtroClienteId, setFiltroClienteId] = React.useState(TODOS);
  const [revisando, setRevisando] = React.useState<LinhaParcelaAcordo | null>(null);

  React.useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const [acordos, clientesCarregados] = await Promise.all([listarAcordos(), listarClientes()]);
    setClientes(clientesCarregados);

    const mapaClientes = new Map<string, Cliente>(clientesCarregados.map((c) => [c.id, c]));
    const todasLinhas: LinhaParcelaAcordo[] = [];
    for (const acordo of acordos as Acordo[]) {
      for (const parcela of acordo.cronograma) {
        todasLinhas.push({
          parcela,
          clienteId: acordo.clienteId,
          clienteNome: mapaClientes.get(acordo.clienteId)?.nome ?? "—",
          acordoNumero: acordo.numero,
        });
      }
    }
    setLinhas(todasLinhas);
  }

  async function handleConfirmar(parcelaAcordoId: string) {
    try {
      await confirmarPagamentoAcordo(parcelaAcordoId);
      if (usuario && revisando) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Confirmou o pagamento (acordo)",
          entidade: "Parcela de acordo",
          entidadeId: `${revisando.acordoNumero} · parcela ${revisando.parcela.numero}`,
        });
      }
      toast.success("Pagamento confirmado. O cliente já pode ver a parcela como paga.");
      setRevisando(null);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível confirmar o pagamento.");
    }
  }

  async function handleRecusar(parcelaAcordoId: string) {
    try {
      await recusarPagamentoAcordo(parcelaAcordoId);
      if (usuario && revisando) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Recusou o pagamento (acordo)",
          entidade: "Parcela de acordo",
          entidadeId: `${revisando.acordoNumero} · parcela ${revisando.parcela.numero}`,
        });
      }
      toast.success("Pagamento recusado. A parcela voltou para cobrança.");
      setRevisando(null);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível recusar o pagamento.");
    }
  }

  if (!linhas) return <Skeleton className="h-96 w-full" />;

  const filtradas = linhas.filter((l) => {
    if (filtro !== "todos" && l.parcela.status !== filtro) return false;
    if (filtroClienteId !== TODOS && l.clienteId !== filtroClienteId) return false;
    return true;
  });
  const totalPago = linhas
    .filter((l) => l.parcela.status === "pago")
    .reduce((soma, l) => soma + l.parcela.valor, 0);
  const totalEmAberto = linhas
    .filter((l) => l.parcela.status === "em_aberto" || l.parcela.status === "vencido")
    .reduce((soma, l) => soma + l.parcela.valor, 0);
  const aguardandoConfirmacao = linhas.filter((l) => l.parcela.status === "aguardando_confirmacao");

  const clientesDisponiveis = clientes.filter((c) => linhas.some((l) => l.clienteId === c.id));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Financeiro Acordos</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total recebido" value={formatCurrency(totalPago)} icon={Wallet} tone="success" />
        <StatCard label="Total em aberto" value={formatCurrency(totalEmAberto)} icon={Wallet} tone="warning" />
        <StatCard
          label="Aguardando confirmação"
          value={String(aguardandoConfirmacao.length)}
          icon={Clock}
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filtro === f.value ? "default" : "outline"}
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <SelectBusca
          value={filtroClienteId}
          onValueChange={setFiltroClienteId}
          placeholder="Filtrar por cliente"
          searchPlaceholder="Buscar cliente…"
          className="w-56"
          options={[
            { value: TODOS, label: "Todos os clientes" },
            ...clientesDisponiveis.map((cliente) => ({ value: cliente.id, label: cliente.nome })),
          ]}
        />
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma parcela de acordo encontrada" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Acordo</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.slice(0, 100).map((linha) => {
              const { parcela, clienteNome, acordoNumero } = linha;
              return (
                <TableRow key={parcela.id}>
                  <TableCell>{clienteNome}</TableCell>
                  <TableCell>{acordoNumero}</TableCell>
                  <TableCell>{parcela.numero}</TableCell>
                  <TableCell>{formatCurrency(parcela.valor)}</TableCell>
                  <TableCell>{formatDate(parcela.vencimento)}</TableCell>
                  <TableCell>
                    <StatusPill status={parcela.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {parcela.status === "aguardando_confirmacao" && (
                      <Button size="sm" onClick={() => setRevisando(linha)}>
                        <Clock className="size-4" />
                        Revisar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <RevisarPagamentoAcordoDialog
        parcela={revisando?.parcela ?? null}
        clienteNome={revisando?.clienteNome ?? ""}
        acordoNumero={revisando?.acordoNumero ?? ""}
        open={revisando !== null}
        onOpenChange={(open) => !open && setRevisando(null)}
        onConfirmar={handleConfirmar}
        onRecusar={handleRecusar}
      />
    </div>
  );
}
