"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  Receipt,
  ShieldCheck,
  Percent,
  Landmark,
  TrendingUp,
  Award,
  Headset,
} from "lucide-react";

import { useContratoAtivo } from "@/hooks/use-contrato-ativo";
import { listarParcelasPorContrato, obterParametrosFinanceiros } from "@/lib/services/financeiro.service";
import { buscarScorePorCliente } from "@/lib/services/score.service";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { formatCurrency, formatDate, daysBetween } from "@/lib/utils/formatters";
import type { ParametrosFinanceiros, Parcela, ScoreLocatario } from "@/lib/types";

import { VehicleCard } from "@/components/shared/vehicle-card";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MESES = [
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

export default function DashboardPage() {
  const { cliente, contrato, veiculo, loading } = useContratoAtivo();
  const [parcelas, setParcelas] = React.useState<Parcela[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);
  const [score, setScore] = React.useState<ScoreLocatario | null>(null);

  const [mesFiltro, setMesFiltro] = React.useState("todos");
  const [anoFiltro, setAnoFiltro] = React.useState("todos");

  React.useEffect(() => {
    if (!contrato || !cliente) return;
    listarParcelasPorContrato(contrato.id).then(setParcelas);
    obterParametrosFinanceiros().then(setParametros);
    buscarScorePorCliente(cliente.id).then((s) => setScore(s ?? null));
  }, [contrato, cliente]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!contrato || !veiculo) {
    return (
      <EmptyState
        icon={Wallet}
        title="Nenhum contrato ativo encontrado"
        description="Assim que um contrato for vinculado à sua conta, ele aparecerá aqui."
      />
    );
  }

  const anosDisponiveis = Array.from(
    new Set(parcelas.map((p) => new Date(p.dataVencimento).getFullYear()))
  ).sort((a, b) => a - b);

  const parcelasFiltradas = parcelas.filter((p) => {
    const data = new Date(p.dataVencimento);
    if (mesFiltro !== "todos" && data.getMonth() !== Number(mesFiltro)) return false;
    if (anoFiltro !== "todos" && data.getFullYear() !== Number(anoFiltro)) return false;
    return true;
  });

  const proximaParcela = parcelas
    .filter((p) => p.status === "em_aberto" || p.status === "vencido")
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())[0];
  const temPagamentoEmAnalise = parcelas.some((p) => p.status === "aguardando_confirmacao");

  const parcelasPagas = parcelasFiltradas.filter((p) => p.status === "pago");
  const parcelasEmAberto = parcelasFiltradas.filter((p) => p.status !== "pago");
  const totalPago = parcelasPagas.reduce((soma, p) => soma + p.valorOriginal, 0);
  const totalEmAberto = parametros
    ? parcelasEmAberto.reduce((soma, p) => soma + calcularValorAtualizado(p, parametros).valorFinal, 0)
    : 0;
  const totalMultas = parametros
    ? parcelasEmAberto.reduce((soma, p) => soma + calcularValorAtualizado(p, parametros).multa, 0)
    : 0;
  const totalJuros = parametros
    ? parcelasEmAberto.reduce((soma, p) => soma + calcularValorAtualizado(p, parametros).juros, 0)
    : 0;

  const diasRestantes = Math.max(0, daysBetween(new Date(), contrato.dataFim));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={mesFiltro} onValueChange={setMesFiltro}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {MESES.map((mes, indice) => (
              <SelectItem key={mes} value={String(indice)}>
                {mes}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={anoFiltro} onValueChange={setAnoFiltro}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os anos</SelectItem>
            {anosDisponiveis.map((ano) => (
              <SelectItem key={ano} value={String(ano)}>
                {ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <VehicleCard
        veiculo={veiculo}
        contrato={contrato}
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link href="/atendimento/novo">
              <Headset className="size-4" />
              Solicitar atendimento
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="gap-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Parcela atual</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">
              {proximaParcela ? formatCurrency(proximaParcela.valorOriginal) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {proximaParcela
                ? `Vence em ${formatDate(proximaParcela.dataVencimento)}`
                : temPagamentoEmAnalise
                  ? "Pagamento em análise"
                  : "Nenhuma parcela pendente"}
            </span>
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader>
            <CardTitle>Dias restantes de contrato</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">{diasRestantes} dias</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(contrato.dataInicio)} — {formatDate(contrato.dataFim)}
            </span>
          </CardContent>
        </Card>

        {score && (
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>Score do locatário</CardTitle>
              <Link href="/score" className="text-xs text-gold hover:underline">
                Ver detalhes
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-foreground">{score.pontuacao}</span>
                <span className="text-xs uppercase tracking-wide text-gold">{score.categoria}</span>
              </div>
              <Progress value={(score.pontuacao / 1000) * 100} />
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Indicadores financeiros</h2>
        {parcelasFiltradas.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma parcela no período selecionado" />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Valor total pago" value={formatCurrency(totalPago)} icon={TrendingUp} tone="success" />
            <StatCard label="Valor em aberto" value={formatCurrency(totalEmAberto)} icon={Wallet} tone="warning" />
            <StatCard
              label="Parcelas pagas"
              value={`${parcelasPagas.length}/${parcelasFiltradas.length}`}
              icon={Receipt}
            />
            <StatCard
              label="Parcelas restantes"
              value={String(parcelasEmAberto.length)}
              icon={Receipt}
            />
            <StatCard label="Multas em aberto" value={formatCurrency(totalMultas)} icon={Percent} tone="destructive" />
            <StatCard label="Juros acumulados" value={formatCurrency(totalJuros)} icon={Percent} tone="destructive" />
            <StatCard label="Valor da caução" value={formatCurrency(contrato.valorCaucao)} icon={Landmark} />
            <StatCard
              label="Limite para renovação"
              value={formatCurrency(contrato.limiteRenovacao)}
              icon={ShieldCheck}
            />
          </div>
        )}
      </div>

      {score && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4 text-gold" />
              Categoria {score.categoria}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Continue pagando em dia para subir de categoria e desbloquear mais benefícios na sua
              próxima renovação.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
