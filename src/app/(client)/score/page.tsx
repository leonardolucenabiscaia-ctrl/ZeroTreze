"use client";

import * as React from "react";
import { Award, CheckCircle2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/lib/auth/auth-context";
import { buscarScorePorCliente } from "@/lib/services/score.service";
import { progressoNaFaixa } from "@/lib/calculations/score";
import { BENEFICIOS_POR_CATEGORIA, FAIXA_POR_CATEGORIA } from "@/lib/types";
import { formatDate } from "@/lib/utils/formatters";
import type { CategoriaScore, ScoreLocatario } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

const CATEGORIAS: CategoriaScore[] = ["bronze", "prata", "ouro", "platina", "diamante"];

export default function ScorePage() {
  const { cliente } = useAuth();
  const [score, setScore] = React.useState<ScoreLocatario | null>(null);

  React.useEffect(() => {
    if (!cliente) return;
    buscarScorePorCliente(cliente.id).then((s) => setScore(s ?? null));
  }, [cliente]);

  if (!score) return <Skeleton className="h-96 w-full" />;

  const dadosGrafico = score.historico.map((h) => ({
    data: formatDate(h.data, "MMM"),
    pontuacao: h.pontuacao,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Score do locatário</h1>

      <Card className="items-center gap-3 text-center">
        <Award className="size-8 text-gold" />
        <span className="text-4xl font-semibold text-foreground">{score.pontuacao}</span>
        <span className="text-sm uppercase tracking-wide text-gold">{score.categoria}</span>
        <div className="w-full max-w-sm">
          <Progress value={progressoNaFaixa(score.pontuacao)} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIAS.map((categoria) => {
          const [min, max] = FAIXA_POR_CATEGORIA[categoria];
          const atual = categoria === score.categoria;
          return (
            <div
              key={categoria}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-4",
                atual ? "border-gold bg-gold-muted" : "border-border"
              )}
            >
              <span className={cn("text-sm font-medium capitalize", atual ? "text-gold" : "text-foreground")}>
                {categoria}
              </span>
              <span className="text-xs text-muted-foreground">
                {min} – {max} pts
              </span>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Evolução do score</CardTitle>
        </CardHeader>
        <CardContent className="h-56 flex-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="data" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} width={30} domain={[0, 1000]} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="pontuacao" stroke="var(--gold)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Benefícios da categoria {score.categoria}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {BENEFICIOS_POR_CATEGORIA[score.categoria].map((beneficio) => (
            <div key={beneficio} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              {beneficio}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Critérios avaliados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Info label="Pontualidade" value={`${score.pontualidadePagamentos}%`} />
          <Info label="Atrasos" value={String(score.quantidadeAtrasos)} />
          <Info label="Tempo como cliente" value={`${score.tempoComoClienteMeses} meses`} />
          <Info label="Conservação do veículo" value={`${score.conservacaoVeiculo}%`} />
          <Info label="Contratos" value={String(score.quantidadeContratos)} />
          <Info label="Ocorrências" value={String(score.quantidadeOcorrencias)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
