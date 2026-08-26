"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, FolderOpen, Lock, Pencil, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";

import {
  buscarVeiculoPorId,
  atualizarQuilometragem,
  atualizarVeiculo,
  marcarVeiculoIndisponivel,
  marcarVeiculoDisponivel,
  excluirVeiculo,
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
  const router = useRouter();
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
  const [confirmandoIndisponibilidade, setConfirmandoIndisponibilidade] = React.useState(false);
  const [alternandoIndisponibilidade, setAlternandoIndisponibilidade] = React.useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = React.useState(false);
  const [placaDigitada, setPlacaDigitada] = React.useState("");
  const [excluindo, setExcluindo] = React.useState(false);

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

  async function handleConfirmarIndisponibilidade() {
    if (!veiculo) return;
    setAlternandoIndisponibilidade(true);
    try {
      const vaiMarcar = !veiculo.indisponivel;
      const atualizado = vaiMarcar
        ? await marcarVeiculoIndisponivel(veiculo.id)
        : await marcarVeiculoDisponivel(veiculo.id);
      setVeiculo(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: vaiMarcar ? "Marcou o veículo como indisponível" : "Marcou o veículo como disponível",
          entidade: "Veículo",
          entidadeId: `${atualizado.marca} ${atualizado.modelo} — ${atualizado.placa}`,
        });
      }
      toast.success(vaiMarcar ? "Veículo marcado como indisponível." : "Veículo disponível novamente.");
      setConfirmandoIndisponibilidade(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a disponibilidade do veículo.");
    } finally {
      setAlternandoIndisponibilidade(false);
    }
  }

  async function handleConfirmarExclusao() {
    if (!veiculo) return;
    setExcluindo(true);
    try {
      await excluirVeiculo(veiculo.id);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Excluiu o veículo",
          entidade: "Veículo",
          entidadeId: `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`,
        });
      }
      toast.success("Veículo excluído com sucesso.");
      router.push("/admin/veiculos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o veículo.");
      setExcluindo(false);
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
            {veiculo.bloqueado && <Badge variant="destructive">Bloqueado</Badge>}
            {veiculo.indisponivel && <Badge variant="warning">Indisponível</Badge>}
            <Button size="sm" variant="outline" onClick={abrirEdicaoDados}>
              <Pencil className="size-3.5" />
              Completar dados
            </Button>
            <Button
              size="sm"
              variant={veiculo.indisponivel ? "secondary" : "outline"}
              onClick={() => setConfirmandoIndisponibilidade(true)}
            >
              {veiculo.indisponivel ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
              {veiculo.indisponivel ? "Marcar disponível" : "Marcar indisponível"}
            </Button>
            {usuario?.perfil === "administrador" && (
              <Button size="sm" variant="destructive" onClick={() => setConfirmandoExclusao(true)}>
                <Trash2 className="size-3.5" />
                Excluir veículo
              </Button>
            )}
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

      <Dialog open={confirmandoIndisponibilidade} onOpenChange={setConfirmandoIndisponibilidade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Marcar {veiculo.placa} como {veiculo.indisponivel ? "disponível" : "indisponível"}?
            </DialogTitle>
            <DialogDescription>
              {veiculo.indisponivel
                ? "O veículo volta a aparecer como disponível para novos contratos."
                : "Marca o veículo como temporariamente indisponível (ex.: reservado, aguardando limpeza ou documentação) — diferente de bloqueio ou manutenção. Ele some da lista de veículos disponíveis até ser liberado de novo."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmandoIndisponibilidade(false)}
              disabled={alternandoIndisponibilidade}
            >
              Cancelar
            </Button>
            <Button
              variant={veiculo.indisponivel ? "default" : "destructive"}
              onClick={handleConfirmarIndisponibilidade}
              disabled={alternandoIndisponibilidade}
            >
              {alternandoIndisponibilidade
                ? "Salvando…"
                : veiculo.indisponivel
                  ? "Sim, marcar disponível"
                  : "Sim, marcar indisponível"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmandoExclusao} onOpenChange={(open) => { setConfirmandoExclusao(open); if (!open) setPlacaDigitada(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirme digitando a placa do veículo</DialogTitle>
            <DialogDescription>
              Essa ação é definitiva e não pode ser desfeita. Só é possível excluir veículos sem
              nenhum contrato vinculado (nem histórico) — se houver, a exclusão será recusada. Para
              confirmar, digite <strong className="text-foreground">{veiculo.placa}</strong> abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmacaoPlaca">Placa</Label>
            <Input
              id="confirmacaoPlaca"
              value={placaDigitada}
              onChange={(e) => setPlacaDigitada(e.target.value)}
              placeholder={veiculo.placa}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmandoExclusao(false)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarExclusao}
              disabled={excluindo || placaDigitada.trim().toUpperCase() !== veiculo.placa.toUpperCase()}
            >
              {excluindo ? "Excluindo…" : "Excluir definitivamente"}
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
