"use client";

import * as React from "react";
import { Wallet, Clock } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { listarContratos } from "@/lib/services/contratos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { listarVeiculos } from "@/lib/services/veiculos.service";
import {
  listarParcelasPorContrato,
  obterParametrosFinanceiros,
  confirmarPagamento,
  recusarPagamento,
} from "@/lib/services/financeiro.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { Cliente, Contrato, ParametrosFinanceiros, Parcela, StatusParcela, Veiculo } from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { StatusPill } from "@/components/shared/status-pill";
import { RevisarPagamentoDialog } from "@/components/shared/revisar-pagamento-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

type Filtro = "todos" | StatusParcela;
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "aguardando_confirmacao", label: "Aguardando confirmação" },
  { value: "pago", label: "Pago" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "vencido", label: "Vencido" },
];

const TODOS = "todos";

interface LinhaParcela {
  parcela: Parcela;
  clienteId: string;
  clienteNome: string;
  veiculoId: string;
  veiculoNome: string;
  contratoNumero: string;
}

export default function AdminFinanceiroPage() {
  const { usuario } = useAuth();
  const [linhas, setLinhas] = React.useState<LinhaParcela[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = React.useState<Veiculo[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);
  const [filtro, setFiltro] = React.useState<Filtro>("todos");
  const [filtroClienteId, setFiltroClienteId] = React.useState(TODOS);
  const [filtroVeiculoId, setFiltroVeiculoId] = React.useState(TODOS);
  const [revisando, setRevisando] = React.useState<LinhaParcela | null>(null);

  React.useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const [contratos, clientesCarregados, veiculosCarregados, params] = await Promise.all([
      listarContratos(),
      listarClientes(),
      listarVeiculos(),
      obterParametrosFinanceiros(),
    ]);
    setParametros(params);
    setClientes(clientesCarregados);
    setVeiculos(veiculosCarregados);

    const mapaClientes = new Map<string, Cliente>(clientesCarregados.map((c) => [c.id, c]));
    const mapaVeiculos = new Map<string, Veiculo>(veiculosCarregados.map((v) => [v.id, v]));
    const todasLinhas: LinhaParcela[] = [];
    for (const contrato of contratos as Contrato[]) {
      const parcelas = await listarParcelasPorContrato(contrato.id);
      const veiculo = mapaVeiculos.get(contrato.veiculoId);
      for (const parcela of parcelas) {
        todasLinhas.push({
          parcela,
          clienteId: contrato.clienteId,
          clienteNome: mapaClientes.get(contrato.clienteId)?.nome ?? "—",
          veiculoId: contrato.veiculoId,
          veiculoNome: veiculo ? `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}` : "—",
          contratoNumero: contrato.numero,
        });
      }
    }
    setLinhas(todasLinhas);
  }

  async function handleConfirmar(parcelaId: string) {
    try {
      await confirmarPagamento(parcelaId);
      if (usuario && revisando) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Confirmou o pagamento",
          entidade: "Parcela",
          entidadeId: `${revisando.contratoNumero} · parcela ${revisando.parcela.numero}`,
        });
      }
      toast.success("Pagamento confirmado. O cliente já pode ver a parcela como paga.");
      setRevisando(null);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível confirmar o pagamento.");
    }
  }

  async function handleRecusar(parcelaId: string) {
    try {
      await recusarPagamento(parcelaId);
      if (usuario && revisando) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Recusou o pagamento",
          entidade: "Parcela",
          entidadeId: `${revisando.contratoNumero} · parcela ${revisando.parcela.numero}`,
        });
      }
      toast.success("Pagamento recusado. A parcela voltou para cobrança.");
      setRevisando(null);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível recusar o pagamento.");
    }
  }

  if (!linhas || !parametros) return <Skeleton className="h-96 w-full" />;

  const filtradas = linhas.filter((l) => {
    if (filtro !== "todos" && l.parcela.status !== filtro) return false;
    if (filtroClienteId !== TODOS && l.clienteId !== filtroClienteId) return false;
    if (filtroVeiculoId !== TODOS && l.veiculoId !== filtroVeiculoId) return false;
    return true;
  });
  const totalPago = linhas
    .filter((l) => l.parcela.status === "pago")
    .reduce((soma, l) => soma + l.parcela.valorOriginal, 0);
  const totalEmAberto = linhas
    .filter((l) => l.parcela.status === "em_aberto" || l.parcela.status === "vencido")
    .reduce((soma, l) => soma + calcularValorAtualizado(l.parcela, parametros).valorFinal, 0);
  const totalMultas = linhas
    .filter((l) => l.parcela.status === "em_aberto" || l.parcela.status === "vencido")
    .reduce((soma, l) => soma + calcularValorAtualizado(l.parcela, parametros).multa, 0);
  const aguardandoConfirmacao = linhas.filter((l) => l.parcela.status === "aguardando_confirmacao");

  // Ao escolher um cliente, só faz sentido oferecer no filtro de carro os veículos que ele já
  // teve em algum contrato — e vice-versa — senão a combinação dos dois filtros sempre dá lista
  // vazia.
  const veiculosDisponiveis =
    filtroClienteId === TODOS
      ? veiculos
      : veiculos.filter((v) => linhas.some((l) => l.clienteId === filtroClienteId && l.veiculoId === v.id));

  const clientesDisponiveis =
    filtroVeiculoId === TODOS
      ? clientes
      : clientes.filter((c) => linhas.some((l) => l.veiculoId === filtroVeiculoId && l.clienteId === c.id));

  function handleFiltroCliente(novoClienteId: string) {
    setFiltroClienteId(novoClienteId);
    if (
      novoClienteId !== TODOS &&
      filtroVeiculoId !== TODOS &&
      !linhas!.some((l) => l.clienteId === novoClienteId && l.veiculoId === filtroVeiculoId)
    ) {
      setFiltroVeiculoId(TODOS);
    }
  }

  function handleFiltroVeiculo(novoVeiculoId: string) {
    setFiltroVeiculoId(novoVeiculoId);
    if (
      novoVeiculoId !== TODOS &&
      filtroClienteId !== TODOS &&
      !linhas!.some((l) => l.veiculoId === novoVeiculoId && l.clienteId === filtroClienteId)
    ) {
      setFiltroClienteId(TODOS);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Financeiro</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total recebido" value={formatCurrency(totalPago)} icon={Wallet} tone="success" />
        <StatCard label="Total em aberto" value={formatCurrency(totalEmAberto)} icon={Wallet} tone="warning" />
        <StatCard label="Multas em aberto" value={formatCurrency(totalMultas)} icon={Wallet} tone="destructive" />
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
        <Select value={filtroClienteId} onValueChange={handleFiltroCliente}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os clientes</SelectItem>
            {clientesDisponiveis.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroVeiculoId} onValueChange={handleFiltroVeiculo}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por carro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os carros</SelectItem>
            {veiculosDisponiveis.map((veiculo) => (
              <SelectItem key={veiculo.id} value={veiculo.id}>
                {veiculo.marca} {veiculo.modelo} — {veiculo.placa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma parcela encontrada" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Valor atualizado</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.slice(0, 100).map((linha) => {
              const { parcela, clienteNome, veiculoNome, contratoNumero } = linha;
              const atualizado = calcularValorAtualizado(parcela, parametros);
              return (
                <TableRow key={parcela.id}>
                  <TableCell>{clienteNome}</TableCell>
                  <TableCell>{veiculoNome}</TableCell>
                  <TableCell>{contratoNumero}</TableCell>
                  <TableCell>{parcela.numero}</TableCell>
                  <TableCell>{formatCurrency(atualizado.valorFinal)}</TableCell>
                  <TableCell>{formatDate(parcela.dataVencimento)}</TableCell>
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

      <RevisarPagamentoDialog
        parcela={revisando?.parcela ?? null}
        clienteNome={revisando?.clienteNome ?? ""}
        contratoNumero={revisando?.contratoNumero ?? ""}
        parametros={parametros}
        open={revisando !== null}
        onOpenChange={(open) => !open && setRevisando(null)}
        onConfirmar={handleConfirmar}
        onRecusar={handleRecusar}
      />
    </div>
  );
}
