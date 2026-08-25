"use client";

import * as React from "react";
import { Car, Key, Wrench, PaintBucket, Lock, Headset, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { listarVeiculos } from "@/lib/services/veiculos.service";
import { listarContratos } from "@/lib/services/contratos.service";
import { listarChamados } from "@/lib/services/chamados.service";
import { listarSolicitacoes } from "@/lib/services/assistencia.service";
import { formatDateTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import type { Contrato, Veiculo } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [chamadosAbertos, setChamadosAbertos] = React.useState(0);
  const [assistenciasAbertas, setAssistenciasAbertas] = React.useState(0);
  const [atualizadoEm, setAtualizadoEm] = React.useState<string>("");
  const [modoTV, setModoTV] = React.useState(false);

  const carregar = React.useCallback(() => {
    Promise.all([listarVeiculos(), listarContratos(), listarChamados(), listarSolicitacoes()]).then(
      ([v, c, chamados, assistencias]) => {
        setVeiculos(v);
        setContratos(c);
        setChamadosAbertos(chamados.filter((ch) => ch.status !== "resolvido" && ch.status !== "encerrado").length);
        setAssistenciasAbertas(
          assistencias.filter((a) => a.status !== "concluido" && a.status !== "cancelado").length
        );
        setAtualizadoEm(new Date().toISOString());
      }
    );
  }, []);

  React.useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 60000);
    return () => clearInterval(intervalo);
  }, [carregar]);

  React.useEffect(() => {
    function aoMudarFullscreen() {
      if (!document.fullscreenElement) setModoTV(false);
    }
    document.addEventListener("fullscreenchange", aoMudarFullscreen);
    return () => document.removeEventListener("fullscreenchange", aoMudarFullscreen);
  }, []);

  async function ativarModoTV() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // navegador pode bloquear tela cheia (ex.: sem gesto do usuário) — segue só escondendo a barra lateral
    }
    setModoTV(true);
  }

  async function sairModoTV() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // já pode ter saído do fullscreen por outro caminho (Esc)
      }
    }
    setModoTV(false);
  }

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
    <div className={cn(modoTV && "fixed inset-0 z-[100] overflow-hidden bg-background p-4")}>
      <div className={cn("flex flex-col gap-3", modoTV && "h-full")}>
        <div className="flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard de TV — Status da Frota</h1>
            <p className="text-sm text-muted-foreground">Visão geral dos {veiculos.length} veículos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="size-3.5" />
              Atualizado em: {atualizadoEm ? formatDateTime(atualizadoEm) : "—"}
            </div>
            {modoTV ? (
              <Button size="sm" variant="outline" onClick={sairModoTV}>
                <Minimize2 className="size-3.5" />
                Sair da tela cheia
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={ativarModoTV}>
                <Maximize2 className="size-3.5" />
                Tela cheia
              </Button>
            )}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-6">
          {ORDEM.map((status) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            const qtd = contagem[status];
            const percentual = ((qtd / total) * 100).toFixed(2);
            return (
              <Card key={status} className={`gap-1.5 border p-3 ${config.corFundo}`}>
                <Icon className={`size-5 ${config.corTexto}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${config.corTexto}`}>
                  {config.label}
                </span>
                <span className="text-2xl font-bold text-foreground">{qtd}</span>
                <span className="text-xs text-muted-foreground">{percentual}%</span>
              </Card>
            );
          })}
          <Card className="gap-1.5 border bg-blue-500/10 border-blue-500/30 p-3">
            <Headset className="size-5 text-blue-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-400">
              Chamados/Assist. em aberto
            </span>
            <span className="text-2xl font-bold text-foreground">{chamadosAbertos + assistenciasAbertas}</span>
            <span className="text-xs text-muted-foreground">
              {chamadosAbertos} chamado{chamadosAbertos === 1 ? "" : "s"} · {assistenciasAbertas} assist.
            </span>
          </Card>
        </div>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-3 lg:flex-row", !modoTV && "lg:min-h-[420px]")}>
          <Card className="shrink-0 gap-2 p-3 lg:w-64">
            <h2 className="text-xs font-medium text-muted-foreground">Distribuição por status</h2>
            <div className="flex flex-1 flex-col items-center gap-3">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosGrafico} dataKey="value" nameKey="name" innerRadius={36} outerRadius={60} paddingAngle={2}>
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
              <div className="flex w-full flex-col gap-1.5">
                {ORDEM.map((status) => (
                  <div key={status} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_CONFIG[status].cor }} />
                    <span className="text-foreground">{STATUS_CONFIG[status].label}</span>
                    <span className="ml-auto text-muted-foreground">{contagem[status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="min-h-0 flex-1 gap-2 overflow-hidden p-3">
            <h2 className="shrink-0 text-xs font-medium text-muted-foreground">Frota — visão geral</h2>
            <div className="flex flex-1 flex-wrap content-start gap-1.5 overflow-hidden">
              {veiculos.map((veiculo) => {
                const status = statusPorVeiculo.get(veiculo.id) ?? "disponivel";
                const config = STATUS_CONFIG[status];
                return (
                  <div
                    key={veiculo.id}
                    className={`flex w-[9.5rem] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-center ${config.corFundo}`}
                  >
                    <span className="text-[10px] text-muted-foreground">{veiculo.placa}</span>
                    <span className="truncate text-[11px] font-medium text-foreground">
                      {veiculo.marca} {veiculo.modelo}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase ${config.corTexto}`}>{config.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
