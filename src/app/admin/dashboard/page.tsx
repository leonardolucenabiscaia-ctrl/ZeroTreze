"use client";

import * as React from "react";
import {
  Users,
  FileText,
  AlertTriangle,
  Wallet,
  Percent,
  RefreshCw,
  Headset,
  Award,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { listarClientes } from "@/lib/services/clientes.service";
import { listarContratos } from "@/lib/services/contratos.service";
import { listarVeiculos } from "@/lib/services/veiculos.service";
import { listarParcelasPorContrato, obterParametrosFinanceiros } from "@/lib/services/financeiro.service";
import { listarChamados } from "@/lib/services/chamados.service";
import { listarScores } from "@/lib/services/score.service";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { formatCurrency } from "@/lib/utils/formatters";
import type { Chamado, Cliente, Contrato, ParametrosFinanceiros, Parcela, ScoreLocatario, Veiculo } from "@/lib/types";

import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectBusca } from "@/components/ui/select-busca";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_COMPLETO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function AdminDashboardPage() {
  const [carregando, setCarregando] = React.useState(true);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [veiculos, setVeiculos] = React.useState<Veiculo[]>([]);
  const [chamados, setChamados] = React.useState<Chamado[]>([]);
  const [scores, setScores] = React.useState<ScoreLocatario[]>([]);
  const [parcelas, setParcelas] = React.useState<Parcela[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);

  const [veiculoFiltro, setVeiculoFiltro] = React.useState("todos");
  const [mesFiltro, setMesFiltro] = React.useState("todos");
  const [anoFiltro, setAnoFiltro] = React.useState("todos");

  React.useEffect(() => {
    async function carregar() {
      const [clientesCarregados, contratosCarregados, veiculosCarregados, chamadosCarregados, scoresCarregados, parametrosCarregados] =
        await Promise.all([
          listarClientes(),
          listarContratos(),
          listarVeiculos(),
          listarChamados(),
          listarScores(),
          obterParametrosFinanceiros(),
        ]);

      const todasParcelas = (
        await Promise.all(contratosCarregados.map((c) => listarParcelasPorContrato(c.id)))
      ).flat();

      setClientes(clientesCarregados);
      setContratos(contratosCarregados);
      setVeiculos(veiculosCarregados);
      setChamados(chamadosCarregados);
      setScores(scoresCarregados);
      setParcelas(todasParcelas);
      setParametros(parametrosCarregados);
      setCarregando(false);
    }

    carregar();
  }, []);

  function handleTrocarVeiculo(novoVeiculoFiltro: string) {
    setVeiculoFiltro(novoVeiculoFiltro);
    setMesFiltro("todos");
    setAnoFiltro("todos");
  }

  if (carregando || !parametros) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const contratosFiltrados =
    veiculoFiltro === "todos" ? contratos : contratos.filter((c) => c.veiculoId === veiculoFiltro);
  const contratoIdsFiltrados = new Set(contratosFiltrados.map((c) => c.id));
  const clienteIdsFiltrados = new Set(contratosFiltrados.map((c) => c.clienteId));

  const totalClientes =
    veiculoFiltro === "todos" ? clientes.length : clienteIdsFiltrados.size;
  const chamadosFiltrados =
    veiculoFiltro === "todos"
      ? chamados
      : chamados.filter((c) => c.contratoId && contratoIdsFiltrados.has(c.contratoId));
  const scoresFiltrados =
    veiculoFiltro === "todos" ? scores : scores.filter((s) => clienteIdsFiltrados.has(s.clienteId));

  const contratosVencendo = contratosFiltrados.filter((c) => c.status === "vence_em_breve").length;
  const contratosAtivos = contratosFiltrados.filter((c) => c.status !== "encerrado").length;
  const inadimplentes = contratosFiltrados.filter((c) => c.status === "atraso").length;
  const scoreMedio = Math.round(
    scoresFiltrados.reduce((soma, s) => soma + s.pontuacao, 0) / (scoresFiltrados.length || 1)
  );

  const parcelasEscopo = parcelas.filter((p) => contratoIdsFiltrados.has(p.contratoId));
  const anosDisponiveis = Array.from(
    new Set(parcelasEscopo.map((p) => new Date(p.dataVencimento).getFullYear()))
  ).sort((a, b) => a - b);

  const parcelasPeriodo = parcelasEscopo.filter((p) => {
    const data = new Date(p.dataVencimento);
    if (mesFiltro !== "todos" && data.getMonth() !== Number(mesFiltro)) return false;
    if (anoFiltro !== "todos" && data.getFullYear() !== Number(anoFiltro)) return false;
    return true;
  });

  const recebidoPeriodo = parcelasPeriodo
    .filter((p) => p.status === "pago")
    .reduce((soma, p) => soma + p.valorOriginal, 0);
  const totalEmAberto = parcelasPeriodo
    .filter((p) => p.status !== "pago")
    .reduce((soma, p) => soma + calcularValorAtualizado(p, parametros).valorFinal, 0);

  const dadosRecebimentos = (() => {
    const parcelasPagas = parcelasEscopo.filter((p) => p.status === "pago");

    if (anoFiltro !== "todos") {
      const ano = Number(anoFiltro);
      return MESES.map((mes, indice) => ({
        mes,
        valor: parcelasPagas
          .filter((p) => {
            const d = new Date(p.dataVencimento);
            return d.getFullYear() === ano && d.getMonth() === indice;
          })
          .reduce((soma, p) => soma + p.valorOriginal, 0),
      }));
    }

    const hoje = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
      const valor = parcelasPagas
        .filter((p) => {
          const d = new Date(p.dataVencimento);
          return d.getFullYear() === referencia.getFullYear() && d.getMonth() === referencia.getMonth();
        })
        .reduce((soma, p) => soma + p.valorOriginal, 0);
      return { mes: MESES[referencia.getMonth()], valor };
    });
  })();

  const dadosContratos = [
    { status: "Em dia", total: contratosFiltrados.filter((c) => c.status === "em_dia").length },
    { status: "Vencendo", total: contratosVencendo },
    { status: "Atraso", total: inadimplentes },
    { status: "Encerrado", total: contratosFiltrados.filter((c) => c.status === "encerrado").length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <SelectBusca
          value={veiculoFiltro}
          onValueChange={handleTrocarVeiculo}
          placeholder="Veículo"
          searchPlaceholder="Buscar veículo…"
          className="w-56"
          options={[
            { value: "todos", label: "Todos os veículos" },
            ...veiculos.map((v) => ({ value: v.id, label: `${v.modelo} — ${v.placa}` })),
          ]}
        />

        <SelectBusca
          value={mesFiltro}
          onValueChange={setMesFiltro}
          searchPlaceholder="Buscar mês…"
          className="w-40"
          options={[
            { value: "todos", label: "Todos os meses" },
            ...MESES_COMPLETO.map((mes, indice) => ({ value: String(indice), label: mes })),
          ]}
        />

        <SelectBusca
          value={anoFiltro}
          onValueChange={setAnoFiltro}
          searchPlaceholder="Buscar ano…"
          className="w-32"
          options={[
            { value: "todos", label: "Todos os anos" },
            ...anosDisponiveis.map((ano) => ({ value: String(ano), label: String(ano) })),
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Clientes" value={String(totalClientes)} icon={Users} />
        <StatCard label="Contratos ativos" value={String(contratosAtivos)} icon={FileText} />
        <StatCard
          label="Contratos vencendo"
          value={String(contratosVencendo)}
          icon={RefreshCw}
          tone="warning"
        />
        <StatCard
          label="Inadimplência"
          value={String(inadimplentes)}
          icon={AlertTriangle}
          tone="destructive"
        />
        <StatCard label="Recebido no período" value={formatCurrency(recebidoPeriodo)} icon={Wallet} tone="success" />
        <StatCard label="Total em aberto" value={formatCurrency(totalEmAberto)} icon={Percent} tone="warning" />
        <StatCard label="Chamados" value={String(chamadosFiltrados.length)} icon={Headset} />
        <StatCard label="Score médio" value={String(scoreMedio)} icon={Award} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recebimentos mensais</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex-none">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosRecebimentos}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Line type="monotone" dataKey="valor" stroke="var(--gold)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contratos por status</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosContratos}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} width={30} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" fill="var(--gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
