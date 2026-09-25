"use client";

import * as React from "react";
import { Eye, Wallet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { listarMultas, aplicarDescontoMulta, darBaixaManualMulta } from "@/lib/services/multas.service";
import { listarContratos } from "@/lib/services/contratos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { calcularValorAtualizadoMulta } from "@/lib/calculations/multa";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Cliente, Contrato, Multa, StatusMulta } from "@/lib/types";

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
import {
  MultaDetalheDialog,
  type BaixaManualMultaInput,
  type DescontoMultaInput,
} from "@/components/shared/multa-detalhe-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

type Filtro = "todas" | StatusMulta;
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pendente", label: "Pendente" },
  { value: "vencida", label: "Vencida" },
  { value: "paga", label: "Paga" },
  { value: "recorrida", label: "Recorrida" },
];

const TODOS = "todos";

interface LinhaMulta {
  multa: Multa;
  clienteId: string;
  clienteNome: string;
}

export default function AdminFinanceiroMultasPage() {
  const { usuario } = useAuth();
  const [linhas, setLinhas] = React.useState<LinhaMulta[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [filtro, setFiltro] = React.useState<Filtro>("todas");
  const [filtroClienteId, setFiltroClienteId] = React.useState(TODOS);
  const [multaDetalhe, setMultaDetalhe] = React.useState<LinhaMulta | null>(null);

  React.useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const [multas, contratos, clientesCarregados] = await Promise.all([
      listarMultas(),
      listarContratos(),
      listarClientes(),
    ]);
    setClientes(clientesCarregados);

    const mapaClientes = new Map<string, Cliente>(clientesCarregados.map((c) => [c.id, c]));
    const mapaContratos = new Map<string, Contrato>(contratos.map((c) => [c.id, c]));
    setLinhas(
      multas.map((multa) => {
        const contrato = mapaContratos.get(multa.contratoId);
        const cliente = contrato ? mapaClientes.get(contrato.clienteId) : undefined;
        return { multa, clienteId: cliente?.id ?? "", clienteNome: cliente?.nome ?? "—" };
      })
    );
  }

  async function handleAplicarDesconto(multaId: string, desconto: DescontoMultaInput) {
    try {
      const atualizada = await aplicarDescontoMulta(multaId, desconto, usuario?.nome ?? "Administrador");
      if (multaDetalhe) setMultaDetalhe({ ...multaDetalhe, multa: atualizada });
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Aplicou desconto numa multa",
          entidade: "Multa",
          entidadeId: atualizada.numeroAuto,
        });
      }
      toast.success(atualizada.desconto ? "Desconto aplicado com sucesso." : "Desconto removido.");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar o desconto.");
    }
  }

  async function handleDarBaixa(multaId: string, dados: BaixaManualMultaInput) {
    try {
      const atualizada = await darBaixaManualMulta(multaId, dados, usuario?.nome ?? "Administrador");
      if (multaDetalhe) setMultaDetalhe({ ...multaDetalhe, multa: atualizada });
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Deu baixa manual no pagamento de uma multa",
          entidade: "Multa",
          entidadeId: atualizada.numeroAuto,
        });
      }
      toast.success("Baixa registrada — a multa já está marcada como paga.");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível dar baixa no pagamento.");
    }
  }

  if (!linhas) return <Skeleton className="h-96 w-full" />;

  const filtradas = linhas.filter((l) => {
    if (filtro !== "todas" && l.multa.situacao !== filtro) return false;
    if (filtroClienteId !== TODOS && l.clienteId !== filtroClienteId) return false;
    return true;
  });

  const totalPago = linhas
    .filter((l) => l.multa.situacao === "paga")
    .reduce((soma, l) => soma + calcularValorAtualizadoMulta(l.multa), 0);
  const totalEmAberto = linhas
    .filter((l) => l.multa.situacao !== "paga")
    .reduce((soma, l) => soma + calcularValorAtualizadoMulta(l.multa), 0);
  const totalVencidas = linhas.filter((l) => l.multa.situacao === "vencida").length;

  const clientesDisponiveis = clientes.filter((c) => linhas.some((l) => l.clienteId === c.id));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Financeiro Multas</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total recebido" value={formatCurrency(totalPago)} icon={Wallet} tone="success" />
        <StatCard label="Total em aberto" value={formatCurrency(totalEmAberto)} icon={Wallet} tone="warning" />
        <StatCard label="Multas vencidas" value={String(totalVencidas)} icon={AlertTriangle} tone="destructive" />
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
        <EmptyState icon={Wallet} title="Nenhuma multa encontrada" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Auto</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead>Valor atual</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.slice(0, 100).map((linha) => {
              const { multa, clienteNome } = linha;
              return (
                <TableRow key={multa.id}>
                  <TableCell>{clienteNome}</TableCell>
                  <TableCell className="font-mono text-xs">{multa.numeroAuto}</TableCell>
                  <TableCell>{multa.orgao}</TableCell>
                  <TableCell>{formatCurrency(calcularValorAtualizadoMulta(multa))}</TableCell>
                  <TableCell>{formatDate(multa.vencimento)}</TableCell>
                  <TableCell>
                    <StatusPill status={multa.situacao} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMultaDetalhe(linha)}
                      aria-label="Visualizar multa"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <MultaDetalheDialog
        multa={multaDetalhe?.multa ?? null}
        open={multaDetalhe !== null}
        onOpenChange={(open) => !open && setMultaDetalhe(null)}
        podeAplicarDesconto
        onAplicarDesconto={handleAplicarDesconto}
        podeDarBaixa
        onDarBaixa={handleDarBaixa}
      />
    </div>
  );
}
