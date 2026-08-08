"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Pencil, Wrench } from "lucide-react";
import { toast } from "sonner";

import { buscarVeiculoPorId, atualizarQuilometragem } from "@/lib/services/veiculos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/utils/formatters";
import type { Veiculo } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminVeiculoDetalhePage() {
  const params = useParams<{ veiculoId: string }>();
  const { usuario } = useAuth();
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [editandoKm, setEditandoKm] = React.useState(false);
  const [novaQuilometragem, setNovaQuilometragem] = React.useState("");
  const [salvandoKm, setSalvandoKm] = React.useState(false);

  React.useEffect(() => {
    buscarVeiculoPorId(params.veiculoId).then((v) => setVeiculo(v ?? null));
  }, [params.veiculoId]);

  function abrirEdicaoKm() {
    if (!veiculo) return;
    setNovaQuilometragem(String(veiculo.quilometragem));
    setEditandoKm(true);
  }

  async function handleSalvarQuilometragem(event: React.FormEvent) {
    event.preventDefault();
    if (!veiculo) return;
    const valor = Number(novaQuilometragem);
    setSalvandoKm(true);
    try {
      const atualizado = await atualizarQuilometragem(veiculo.id, valor);
      setVeiculo(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: `Atualizou a quilometragem para ${valor.toLocaleString("pt-BR")} km`,
          entidade: "Veículo",
          entidadeId: `${atualizado.marca} ${atualizado.modelo} — ${atualizado.placa}`,
        });
      }
      toast.success("Quilometragem atualizada com sucesso!");
      setEditandoKm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a quilometragem.");
    } finally {
      setSalvandoKm(false);
    }
  }

  if (!veiculo) return <Skeleton className="h-96 w-full" />;

  const ficha: [string, string][] = [
    ["Placa", veiculo.placa],
    ["Renavam", veiculo.renavam],
    ["Chassi", veiculo.chassi],
    ["Cor", veiculo.cor],
    ["Categoria", veiculo.categoria],
    ["Combustível", veiculo.combustivel],
    ["Seguradora", veiculo.seguradora],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="lg:flex-row lg:items-center">
        <div className="relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/50 lg:w-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={veiculo.fotoUrl} alt={veiculo.modelo} className="h-full w-full object-contain p-4" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {veiculo.marca} {veiculo.modelo} ({veiculo.ano})
          </h1>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Quilometragem</dt>
              <dd className="flex items-center gap-1.5 font-medium text-foreground">
                {veiculo.quilometragem.toLocaleString("pt-BR")} km
                <button
                  type="button"
                  onClick={abrirEdicaoKm}
                  aria-label="Editar quilometragem"
                  className="text-muted-foreground hover:text-gold"
                >
                  <Pencil className="size-3.5" />
                </button>
              </dd>
            </div>
            {ficha.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Dialog open={editandoKm} onOpenChange={setEditandoKm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar quilometragem</DialogTitle>
            <DialogDescription>
              Registre a quilometragem atual de {veiculo.marca} {veiculo.modelo} ({veiculo.placa}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarQuilometragem} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nova-km">Quilometragem (km)</Label>
              <Input
                id="nova-km"
                type="number"
                min={veiculo.quilometragem}
                value={novaQuilometragem}
                onChange={(e) => setNovaQuilometragem(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditandoKm(false)} disabled={salvandoKm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoKm}>
                {salvandoKm ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wrench className="size-4 text-gold" />
            Histórico de manutenção
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {veiculo.historicoManutencao.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium text-foreground">{item.descricao}</p>
                <p className="text-xs text-muted-foreground">{item.oficina}</p>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(item.data)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
