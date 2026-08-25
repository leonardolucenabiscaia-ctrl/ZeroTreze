"use client";

import * as React from "react";
import Link from "next/link";
import { Wrench, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  colocarVeiculoEmManutencao,
  listarVeiculos,
  listarVeiculosEmManutencao,
  retirarVeiculoDeManutencao,
} from "@/lib/services/veiculos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Veiculo } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SelectBusca } from "@/components/ui/select-busca";

const TIPO_LABEL: Record<"mecanica" | "funilaria", string> = {
  mecanica: "Mecânica",
  funilaria: "Funilaria",
};

export default function ManutencaoPage() {
  const { usuario } = useAuth();
  const [emManutencao, setEmManutencao] = React.useState<Veiculo[] | null>(null);
  const [todosOsVeiculos, setTodosOsVeiculos] = React.useState<Veiculo[]>([]);
  const [abrirDialog, setAbrirDialog] = React.useState(false);
  const [veiculoId, setVeiculoId] = React.useState("");
  const [tipo, setTipo] = React.useState<"mecanica" | "funilaria" | "">("");
  const [salvando, setSalvando] = React.useState(false);
  const [concluindoId, setConcluindoId] = React.useState<string | null>(null);

  const carregar = React.useCallback(() => {
    listarVeiculosEmManutencao().then(setEmManutencao);
  }, []);

  React.useEffect(() => {
    carregar();
    listarVeiculos().then(setTodosOsVeiculos);
  }, [carregar]);

  const idsEmManutencao = new Set((emManutencao ?? []).map((v) => v.id));
  const veiculosDisponiveisParaAdicionar = todosOsVeiculos.filter((v) => !idsEmManutencao.has(v.id));

  function abrirNovoDialog() {
    setVeiculoId("");
    setTipo("");
    setAbrirDialog(true);
  }

  async function handleAdicionar(event: React.FormEvent) {
    event.preventDefault();
    if (!veiculoId || !tipo) return;
    setSalvando(true);
    try {
      const veiculo = await colocarVeiculoEmManutencao(veiculoId, tipo);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: `Colocou o veículo em manutenção (${TIPO_LABEL[tipo]})`,
          entidade: "Veículo",
          entidadeId: `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`,
        });
      }
      toast.success("Veículo movido para manutenção.");
      setAbrirDialog(false);
      carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a manutenção.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleConcluir(veiculo: Veiculo) {
    setConcluindoId(veiculo.id);
    try {
      await retirarVeiculoDeManutencao(veiculo.id);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Concluiu a manutenção do veículo",
          entidade: "Veículo",
          entidadeId: `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`,
        });
      }
      toast.success("Manutenção concluída — veículo disponível novamente.");
      carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a manutenção.");
    } finally {
      setConcluindoId(null);
    }
  }

  if (!emManutencao) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Manutenção</h1>
          <p className="text-sm text-muted-foreground">
            Veículos em manutenção mecânica ou funilaria — refletido automaticamente no Dashboard de TV.
          </p>
        </div>
        <Button onClick={abrirNovoDialog}>
          <Plus className="size-4" />
          Adicionar veículo em manutenção
        </Button>
      </div>

      {emManutencao.length === 0 ? (
        <EmptyState icon={Wrench} title="Nenhum veículo em manutenção no momento" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {emManutencao.map((veiculo) => (
            <Card key={veiculo.id} className="gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/admin/veiculos/${veiculo.id}`} className="font-medium text-foreground hover:text-gold">
                    {veiculo.marca} {veiculo.modelo}
                  </Link>
                  <p className="text-xs text-muted-foreground">{veiculo.placa}</p>
                </div>
                <Badge variant={veiculo.manutencaoTipo === "funilaria" ? "neutral" : "warning"}>
                  {veiculo.manutencaoTipo ? TIPO_LABEL[veiculo.manutencaoTipo] : ""}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Desde {veiculo.manutencaoDesde ? formatDateTime(veiculo.manutencaoDesde) : "—"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConcluir(veiculo)}
                disabled={concluindoId === veiculo.id}
              >
                <CheckCircle2 className="size-3.5" />
                {concluindoId === veiculo.id ? "Concluindo…" : "Concluir manutenção"}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={abrirDialog} onOpenChange={setAbrirDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar veículo em manutenção</DialogTitle>
            <DialogDescription>
              O veículo sai da lista de disponíveis até você marcar a manutenção como concluída.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdicionar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Veículo</Label>
              <SelectBusca
                value={veiculoId}
                onValueChange={setVeiculoId}
                placeholder="Selecione o veículo"
                searchPlaceholder="Buscar veículo…"
                options={veiculosDisponiveisParaAdicionar.map((v) => ({
                  value: v.id,
                  label: `${v.marca} ${v.modelo} — ${v.placa}`,
                }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <SelectBusca
                value={tipo}
                onValueChange={(v) => setTipo(v as "mecanica" | "funilaria")}
                placeholder="Selecione o tipo"
                searchPlaceholder="Buscar tipo…"
                options={[
                  { value: "mecanica", label: "Mecânica" },
                  { value: "funilaria", label: "Funilaria" },
                ]}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbrirDialog(false)} disabled={salvando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando || !veiculoId || !tipo}>
                {salvando ? "Salvando…" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
