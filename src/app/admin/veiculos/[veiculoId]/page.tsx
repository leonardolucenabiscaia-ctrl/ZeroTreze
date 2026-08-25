"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FileText, FolderOpen, Lock, Pencil, Unlock } from "lucide-react";
import { toast } from "sonner";

import {
  buscarVeiculoPorId,
  atualizarQuilometragem,
  atualizarVeiculo,
  bloquearVeiculo,
  desbloquearVeiculo,
} from "@/lib/services/veiculos.service";
import { listarDocumentosPorVeiculo } from "@/lib/services/documentos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/utils/formatters";
import type { Documento, Veiculo } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const CATEGORIA_LABEL: Record<string, string> = {
  contrato: "Contrato",
  crlv: "CRLV",
  licenciamento: "Licenciamento",
  apolice: "Apólice",
  comprovante: "Comprovante",
  boleto: "Boleto",
  nota_fiscal: "Nota fiscal",
  recibo: "Recibo",
  cadastro: "Cadastro",
  acordo: "Acordo",
};

export default function AdminVeiculoDetalhePage() {
  const params = useParams<{ veiculoId: string }>();
  const { usuario } = useAuth();
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [documentos, setDocumentos] = React.useState<Documento[]>([]);
  const [editandoKm, setEditandoKm] = React.useState(false);
  const [novaQuilometragem, setNovaQuilometragem] = React.useState("");
  const [salvandoKm, setSalvandoKm] = React.useState(false);
  const [editandoDados, setEditandoDados] = React.useState(false);
  const [cor, setCor] = React.useState("");
  const [categoria, setCategoria] = React.useState("");
  const [salvandoDados, setSalvandoDados] = React.useState(false);
  const [confirmandoBloqueio, setConfirmandoBloqueio] = React.useState(false);
  const [alternandoBloqueio, setAlternandoBloqueio] = React.useState(false);

  React.useEffect(() => {
    buscarVeiculoPorId(params.veiculoId).then((v) => setVeiculo(v ?? null));
    listarDocumentosPorVeiculo(params.veiculoId).then(setDocumentos);
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

  function abrirEdicaoDados() {
    if (!veiculo) return;
    setCor(veiculo.cor);
    setCategoria(veiculo.categoria);
    setEditandoDados(true);
  }

  async function handleSalvarDados(event: React.FormEvent) {
    event.preventDefault();
    if (!veiculo) return;
    setSalvandoDados(true);
    try {
      const atualizado = await atualizarVeiculo(veiculo.id, { cor, categoria });
      setVeiculo(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Completou os dados do veículo",
          entidade: "Veículo",
          entidadeId: `${atualizado.marca} ${atualizado.modelo} — ${atualizado.placa}`,
        });
      }
      toast.success("Dados do veículo atualizados com sucesso!");
      setEditandoDados(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar os dados.");
    } finally {
      setSalvandoDados(false);
    }
  }

  async function handleConfirmarBloqueio() {
    if (!veiculo) return;
    setAlternandoBloqueio(true);
    try {
      const vaiBloquear = !veiculo.bloqueado;
      const atualizado = vaiBloquear ? await bloquearVeiculo(veiculo.id) : await desbloquearVeiculo(veiculo.id);
      setVeiculo(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: vaiBloquear ? "Marcou o veículo como indisponível" : "Marcou o veículo como disponível",
          entidade: "Veículo",
          entidadeId: `${atualizado.marca} ${atualizado.modelo} — ${atualizado.placa}`,
        });
      }
      toast.success(vaiBloquear ? "Veículo marcado como indisponível." : "Veículo disponível novamente.");
      setConfirmandoBloqueio(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a disponibilidade do veículo.");
    } finally {
      setAlternandoBloqueio(false);
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">
              {veiculo.marca} {veiculo.modelo} ({veiculo.ano})
            </h1>
            {veiculo.bloqueado && <Badge variant="destructive">Indisponível</Badge>}
            <Button size="sm" variant="outline" onClick={abrirEdicaoDados}>
              <Pencil className="size-3.5" />
              Completar dados
            </Button>
            <Button
              size="sm"
              variant={veiculo.bloqueado ? "secondary" : "outline"}
              onClick={() => setConfirmandoBloqueio(true)}
            >
              {veiculo.bloqueado ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
              {veiculo.bloqueado ? "Marcar disponível" : "Marcar indisponível"}
            </Button>
          </div>
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

      <Dialog open={editandoDados} onOpenChange={setEditandoDados}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar dados do veículo</DialogTitle>
            <DialogDescription>
              Preencha o que estiver faltando para {veiculo.marca} {veiculo.modelo} ({veiculo.placa}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarDados} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="veiculo-cor">Cor</Label>
              <Input id="veiculo-cor" value={cor} onChange={(e) => setCor(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="veiculo-categoria">Categoria</Label>
              <Input
                id="veiculo-categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditandoDados(false)}
                disabled={salvandoDados}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoDados}>
                {salvandoDados ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmandoBloqueio} onOpenChange={setConfirmandoBloqueio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Marcar {veiculo.placa} como {veiculo.bloqueado ? "disponível" : "indisponível"}?
            </DialogTitle>
            <DialogDescription>
              {veiculo.bloqueado
                ? "O veículo volta a aparecer como disponível para novos contratos."
                : "O veículo fica impedido de uso até ser marcado como disponível de novo. Se houver um contrato ativo vinculado, ele não é afetado — parcelas, prazo e status continuam normalmente."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmandoBloqueio(false)}
              disabled={alternandoBloqueio}
            >
              Cancelar
            </Button>
            <Button
              variant={veiculo.bloqueado ? "default" : "destructive"}
              onClick={handleConfirmarBloqueio}
              disabled={alternandoBloqueio}
            >
              {alternandoBloqueio
                ? "Salvando…"
                : veiculo.bloqueado
                  ? "Sim, marcar disponível"
                  : "Sim, marcar indisponível"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="size-4 text-gold" />
            Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentos.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Nenhum documento vinculado a este veículo" />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {documentos.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 shrink-0 text-gold" />
                    <span className="font-medium text-foreground">{doc.nome}</span>
                    <Badge variant="outline">{CATEGORIA_LABEL[doc.categoria] ?? doc.categoria}</Badge>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatDate(doc.criadoEm)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
