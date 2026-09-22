"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { desbloquearVeiculo, listarVeiculosBloqueados } from "@/lib/services/veiculos.service";
import { contratoAtivoPorVeiculo } from "@/lib/services/contratos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Contrato, Veiculo } from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface LinhaVeiculoBloqueado {
  veiculo: Veiculo;
  contrato: Contrato | undefined;
}

export default function VeiculosBloqueadosPage() {
  const { usuario } = useAuth();
  const [linhas, setLinhas] = React.useState<LinhaVeiculoBloqueado[] | null>(null);
  const [veiculoParaDesbloquear, setVeiculoParaDesbloquear] = React.useState<Veiculo | null>(null);
  const [desbloqueando, setDesbloqueando] = React.useState(false);

  React.useEffect(() => {
    listarVeiculosBloqueados().then(async (veiculos) => {
      const comContrato = await Promise.all(
        veiculos.map(async (veiculo) => ({
          veiculo,
          contrato: await contratoAtivoPorVeiculo(veiculo.id),
        }))
      );
      setLinhas(comContrato);
    });
  }, []);

  async function handleConfirmarDesbloqueio() {
    if (!veiculoParaDesbloquear) return;
    setDesbloqueando(true);
    try {
      const atualizado = await desbloquearVeiculo(veiculoParaDesbloquear.id);
      setLinhas((atuais) => (atuais ?? []).filter((l) => l.veiculo.id !== atualizado.id));
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Desbloqueou o veículo",
          entidade: "Veículo",
          entidadeId: `${atualizado.marca} ${atualizado.modelo} — ${atualizado.placa}`,
        });
      }
      toast.success("Veículo desbloqueado com sucesso.");
      setVeiculoParaDesbloquear(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível desbloquear o veículo.");
    } finally {
      setDesbloqueando(false);
    }
  }

  if (!linhas) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Veículos bloqueados</h1>
        <p className="text-sm text-muted-foreground">
          Veículos com o uso bloqueado — o contrato de cada um continua rodando normalmente.
        </p>
      </div>

      {linhas.length === 0 ? (
        <EmptyState
          icon={Lock}
          title="Nenhum veículo bloqueado"
          description="Todos os veículos da frota estão liberados para uso."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Bloqueado em</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(({ veiculo, contrato }) => (
              <TableRow key={veiculo.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/veiculos/${veiculo.id}`} className="hover:text-gold">
                    {veiculo.marca} {veiculo.modelo}
                  </Link>
                </TableCell>
                <TableCell>{veiculo.placa}</TableCell>
                <TableCell>
                  {contrato ? (
                    <Link href={`/admin/contratos/${contrato.id}`} className="text-gold hover:underline">
                      {contrato.numero}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Sem contrato ativo</span>
                  )}
                </TableCell>
                <TableCell>{veiculo.bloqueadoEm ? formatDateTime(veiculo.bloqueadoEm) : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setVeiculoParaDesbloquear(veiculo)}>
                    <ShieldCheck className="size-3.5" />
                    Desbloquear
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={veiculoParaDesbloquear !== null} onOpenChange={(open) => !open && setVeiculoParaDesbloquear(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desbloquear o veículo {veiculoParaDesbloquear?.placa}?</DialogTitle>
            <DialogDescription>
              O veículo volta a ficar liberado para uso. O contrato não é afetado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVeiculoParaDesbloquear(null)}
              disabled={desbloqueando}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmarDesbloqueio} disabled={desbloqueando}>
              {desbloqueando ? "Salvando…" : "Sim, desbloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
