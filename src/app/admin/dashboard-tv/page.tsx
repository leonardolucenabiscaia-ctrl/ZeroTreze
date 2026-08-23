"use client";

import * as React from "react";
import { Car, Key, Wrench, PaintBucket, Lock, RefreshCw } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { listarVeiculos } from "@/lib/services/veiculos.service";
import { listarContratos } from "@/lib/services/contratos.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Contrato, Veiculo } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StatusFrota = "disponivel" | "locado" | "mecanica" | "funilaria" | "bloqueado";

const STATUS_CONFIG: Record<StatusFrota, { label: string; cor: string; corTexto: string; corFundo: string; icon: typeof Car }> = {
  disponivel: { label: "Disponíveis", cor: "#22c55e", corTexto: "text-green-400", corFundo: "bg-green-500/10 border-green-500/30", icon: Car },
  locado: { label: "Locados", cor: "#eab308", corTexto: "text-gold", corFundo: "bg-gold-muted border-gold/30", icon: Key },
  mecanica: { label: "Mecânica", cor: "#f97316", corTexto: "text-orange-400", corFundo: "bg-orange-500/10 border-orange-500/30", icon: Wrench },
  funilaria: { label: "Funilaria", cor: "#a855f7", corTexto: "text-purple-400", corFundo: "bg-purple-500/10 border-purple-500/30", icon: PaintBucket },
  bloqueado: { label: "Bloqueados", cor: "#ef4444", corTexto: "text-destructive", corFundo: "bg-destructive/10 border-destructive/30", icon: Lock },
};

const ORDEM: StatusFrota[] = ["disponivel", "locado", "mecanica", "funilaria", "bloqueado"];

function statusDoVeiculo(veiculo: Veiculo, veiculoIdsLocados: Set<string>): StatusFrota {
  if (veiculo.bloqueado) return "bloqueado";
  if (veiculo.manutencaoTipo === "mecanica") return "mecanica";
  if (veiculo.manutencaoTipo === "funilaria") return "funilaria";
  if (veiculoIdsLocados.has(veiculo.id)) return "locado";
  return "disponivel";
}

export default function DashboardTvPage() {
  const [veiculos, setVeiculos] = React.useState<Veiculo[] | null>(null);
  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [atualizadoEm, setAtualizadoEm] = React.useState<string>("");

  const carregar = React.useCallback(() => {
    Promise.all([listarVeiculos(), listarContratos()]).then(([v, c]) => {
      setVeiculos(v);
      setContratos(c);
      setAtualizadoEm(new Date().toISOString());
    });
  }, []);

  React.useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 60000);
    return () => clearInterval(intervalo);
  }, [carregar]);

  if (!veiculos) return <Skeleton className="h-96 w-full" />;

  const veiculoIdsLocados = new Set(contratos.filter((c) => c.status !== "encerrado").map((c) => c.veiculoId));
  const statusPorVeiculo = new Map(veiculos.map((v) => [v.id, statusDoVeiculo(v, veiculoIdsLocados)]));

  const contagem: Record<StatusFrota, number> = {
    disponivel: 0,
    locado: 0,
    mecanica: 0,
    funilaria: 0,
    bloqueado: 0,
  };
  statusPorVeiculo.forEach((status) => contagem[status]++);

  const total = veiculos.length || 1;
  const dadosGrafico = ORDEM.map((status) => ({
    name: STATUS_CONFIG[status].label,
    value: contagem[status],
    cor: STATUS_CONFIG[status].cor,
  })).filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard de TV — Status da Frota</h1>
          <p className="text-sm text-muted-foreground">Visão geral dos {veiculos.length} veículos</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3.5" />
          Atualizado em: {atualizadoEm ? formatDateTime(atualizadoEm) : "—"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {ORDEM.map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const qtd = contagem[status];
          const percentual = ((qtd / total) * 100).toFixed(2);
          return (
            <Card key={status} className={`gap-2 border ${config.corFundo}`}>
              <Icon className={`size-6 ${config.corTexto}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${config.corTexto}`}>
                {config.label}
              </span>
              <span className="text-3xl font-bold text-foreground">{qtd}</span>
              <span className="text-xs text-muted-foreground">{percentual}%</span>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Distribuição por status</h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dadosGrafico} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {dadosGrafico.map((d) => (
                    <Cell key={d.name} fill={d.cor} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-1">
            {ORDEM.map((status) => (
              <div key={status} className="flex items-center gap-2 text-sm">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: STATUS_CONFIG[status].cor }} />
                <span className="text-foreground">{STATUS_CONFIG[status].label}</span>
                <span className="text-muted-foreground">
                  {contagem[status]} ({((contagem[status] / total) * 100).toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Frota — visão geral</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {veiculos.map((veiculo) => {
            const status = statusPorVeiculo.get(veiculo.id) ?? "disponivel";
            const config = STATUS_CONFIG[status];
            return (
              <Card key={veiculo.id} className={`items-center gap-1.5 border py-3 text-center ${config.corFundo}`}>
                <span className="text-[11px] text-muted-foreground">{veiculo.placa}</span>
                <span className="text-xs font-medium text-foreground">
                  {veiculo.marca} {veiculo.modelo}
                </span>
                <span className={`text-[11px] font-semibold uppercase ${config.corTexto}`}>{config.label}</span>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
