"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, FileCheck2, FileDown, Lock, Pencil, Printer, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import {
  atualizarContrato,
  buscarContratoPorId,
  encerrarContrato,
  excluirContrato,
} from "@/lib/services/contratos.service";
import { buscarClientePorId } from "@/lib/services/clientes.service";
import { bloquearVeiculo, buscarVeiculoPorId, desbloquearVeiculo } from "@/lib/services/veiculos.service";
import {
  aplicarDescontoParcela,
  darBaixaManual,
  listarParcelasPorContrato,
  obterParametrosFinanceiros,
} from "@/lib/services/financeiro.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { formatDateTime } from "@/lib/utils/formatters";
import { assinaturaConcluida } from "@/lib/utils/assinatura";
import { AVISO_ACORDO_SEM_ATIVIDADE } from "@/lib/types";
import type { Cliente, Contrato, ParametrosFinanceiros, Parcela, Veiculo } from "@/lib/types";

import { VehicleCard } from "@/components/shared/vehicle-card";
import { ParcelasTable } from "@/components/shared/parcelas-table";
import {
  ParcelaDetalheDialog,
  type BaixaManualInput,
  type DescontoParcelaInput,
} from "@/components/shared/parcela-detalhe-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function AdminContratoDetalhePage() {
  const params = useParams<{ contratoId: string }>();
  const router = useRouter();
  const { usuario } = useAuth();
  const [contrato, setContrato] = React.useState<Contrato | null>(null);
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [parcelas, setParcelas] = React.useState<Parcela[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);
  const [parcelaDetalhe, setParcelaDetalhe] = React.useState<Parcela | null>(null);
  const [confirmandoEncerramento, setConfirmandoEncerramento] = React.useState(false);
  const [encerrando, setEncerrando] = React.useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = React.useState(false);
  const [numeroDigitado, setNumeroDigitado] = React.useState("");
  const [excluindo, setExcluindo] = React.useState(false);
  const [avisoAcordoExclusao, setAvisoAcordoExclusao] = React.useState<string | null>(null);
  const [confirmandoBloqueio, setConfirmandoBloqueio] = React.useState(false);
  const [alternandoBloqueio, setAlternandoBloqueio] = React.useState(false);
  const [editandoContrato, setEditandoContrato] = React.useState(false);
  const [numeroEdicao, setNumeroEdicao] = React.useState("");
  const [valorParcelaEdicao, setValorParcelaEdicao] = React.useState("");
  const [caucaoEdicao, setCaucaoEdicao] = React.useState("");
  const [limiteRenovacaoEdicao, setLimiteRenovacaoEdicao] = React.useState("");
  const [salvandoContrato, setSalvandoContrato] = React.useState(false);

  React.useEffect(() => {
    buscarContratoPorId(params.contratoId).then(async (c) => {
      setContrato(c ?? null);
      if (!c) return;
      const [clienteEncontrado, veiculoEncontrado, parcelasEncontradas, parametrosEncontrados] =
        await Promise.all([
          buscarClientePorId(c.clienteId),
          buscarVeiculoPorId(c.veiculoId),
          listarParcelasPorContrato(c.id),
          obterParametrosFinanceiros(),
        ]);
      setCliente(clienteEncontrado ?? null);
      setVeiculo(veiculoEncontrado ?? null);
      setParcelas(parcelasEncontradas);
      setParametros(parametrosEncontrados);
    });
  }, [params.contratoId]);

  async function handleConfirmarEncerramento() {
    if (!contrato) return;
    setEncerrando(true);
    try {
      const atualizado = await encerrarContrato(contrato.id);
      setContrato(atualizado);
      setParcelas((atuais) =>
        atuais.filter((p) => p.status !== "em_aberto" || new Date(p.dataVencimento) <= new Date())
      );
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Encerrou o contrato",
          entidade: "Contrato",
          entidadeId: contrato.numero,
        });
      }
      toast.success("Contrato encerrado com sucesso.");
      setConfirmandoEncerramento(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar o contrato.");
    } finally {
      setEncerrando(false);
    }
  }

  async function handleConfirmarExclusao() {
    if (!contrato) return;
    setExcluindo(true);
    try {
      await excluirContrato(contrato.id, { ignorarAcordoSemAtividade: avisoAcordoExclusao !== null });
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Excluiu o contrato (criado errado)",
          entidade: "Contrato",
          entidadeId: contrato.numero,
        });
      }
      toast.success("Contrato excluído com sucesso.");
      router.push("/admin/contratos");
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Não foi possível excluir o contrato.";
      if (mensagem.startsWith(`${AVISO_ACORDO_SEM_ATIVIDADE}:`)) {
        setAvisoAcordoExclusao(mensagem.slice(AVISO_ACORDO_SEM_ATIVIDADE.length + 1).trim());
      } else {
        toast.error(mensagem);
      }
      setExcluindo(false);
    }
  }

  function abrirEdicaoContrato() {
    if (!contrato) return;
    setNumeroEdicao(contrato.numero);
    setValorParcelaEdicao(String(contrato.valorParcela));
    setCaucaoEdicao(String(contrato.valorCaucao));
    setLimiteRenovacaoEdicao(String(contrato.limiteRenovacao));
    setEditandoContrato(true);
  }

  async function handleSalvarContrato(event: React.FormEvent) {
    event.preventDefault();
    if (!contrato) return;
    setSalvandoContrato(true);
    try {
      const atualizado = await atualizarContrato(contrato.id, {
        numero: numeroEdicao,
        valorParcela: Number(valorParcelaEdicao),
        valorCaucao: Number(caucaoEdicao),
        limiteRenovacao: Number(limiteRenovacaoEdicao),
      });
      setContrato(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Editou os dados do contrato",
          entidade: "Contrato",
          entidadeId: atualizado.numero,
        });
      }
      toast.success("Dados do contrato atualizados com sucesso!");
      setEditandoContrato(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o contrato.");
    } finally {
      setSalvandoContrato(false);
    }
  }

  async function handleConfirmarBloqueio() {
    if (!veiculo || !contrato) return;
    setAlternandoBloqueio(true);
    try {
      const vaiBloquear = !veiculo.bloqueado;
      const atualizado = vaiBloquear ? await bloquearVeiculo(veiculo.id) : await desbloquearVeiculo(veiculo.id);
      setVeiculo(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: vaiBloquear ? "Bloqueou o veículo" : "Desbloqueou o veículo",
          entidade: "Veículo",
          entidadeId: veiculo.placa,
        });
      }
      toast.success(vaiBloquear ? "Veículo bloqueado com sucesso." : "Veículo desbloqueado com sucesso.");
      setConfirmandoBloqueio(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o bloqueio do veículo.");
    } finally {
      setAlternandoBloqueio(false);
    }
  }

  async function handleAplicarDesconto(parcelaId: string, desconto: DescontoParcelaInput) {
    try {
      const atualizada = await aplicarDescontoParcela(parcelaId, desconto, usuario?.nome ?? "Administrador");
      setParcelas((atuais) => atuais.map((p) => (p.id === atualizada.id ? atualizada : p)));
      setParcelaDetalhe(atualizada);
      if (usuario && contrato) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Aplicou desconto em uma parcela",
          entidade: "Parcela",
          entidadeId: `${contrato.numero} — parcela ${atualizada.numero}`,
        });
      }
      toast.success(atualizada.desconto ? "Desconto aplicado com sucesso." : "Desconto removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar o desconto.");
    }
  }

  async function handleDarBaixa(parcelaId: string, dados: BaixaManualInput) {
    try {
      const atualizada = await darBaixaManual(parcelaId, dados, usuario?.nome ?? "Administrador");
      setParcelas((atuais) => atuais.map((p) => (p.id === atualizada.id ? atualizada : p)));
      setParcelaDetalhe(atualizada);
      if (usuario && contrato) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Deu baixa manual num pagamento",
          entidade: "Parcela",
          entidadeId: `${contrato.numero} — parcela ${atualizada.numero}`,
        });
      }
      toast.success("Baixa registrada — a parcela já está marcada como paga.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível dar baixa no pagamento.");
    }
  }

  if (!contrato || !veiculo || !parametros) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex-row items-center justify-between">
        <div className="flex items-center gap-6">
          {cliente ? (
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <Link href={`/admin/clientes/${cliente.id}`} className="text-lg font-semibold text-foreground hover:text-gold">
                {cliente.nome}
              </Link>
            </div>
          ) : (
            <div />
          )}

          {contrato.assinatura && (
            <div>
              <p className="text-xs text-muted-foreground">Assinatura eletrônica</p>
              {assinaturaConcluida(contrato.assinatura.status) ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="success">
                    <FileCheck2 className="size-3" />
                    Assinado
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    em {formatDateTime(contrato.assinatura.atualizadoEm ?? contrato.assinatura.enviadoEm)}
                  </span>
                </div>
              ) : (
                <Badge variant="warning">{contrato.assinatura.status}</Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {contrato.assinatura && assinaturaConcluida(contrato.assinatura.status) && !contrato.arquivoUrl.startsWith("/mock/") && (
            <Button asChild size="sm" variant="outline">
              <a href={contrato.arquivoUrl} target="_blank" rel="noreferrer">
                <FileDown className="size-4" />
                Documento assinado
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/imprimir/contrato/${contrato.id}`}>
              <Printer className="size-4" />
              Imprimir contrato
            </Link>
          </Button>
          {usuario?.perfil === "administrador" && (
            <Button size="sm" variant="outline" onClick={abrirEdicaoContrato}>
              <Pencil className="size-4" />
              Editar contrato
            </Button>
          )}
          <Button
            size="sm"
            variant={veiculo.bloqueado ? "secondary" : "outline"}
            onClick={() => setConfirmandoBloqueio(true)}
          >
            {veiculo.bloqueado ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            {veiculo.bloqueado ? "Desbloquear carro" : "Bloquear carro"}
          </Button>
          {contrato.status !== "encerrado" && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmandoEncerramento(true)}>
              <AlertTriangle className="size-4" />
              Encerrar contrato
            </Button>
          )}
          {contrato.status === "encerrado" && usuario?.perfil === "administrador" && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmandoExclusao(true)}>
              <Trash2 className="size-4" />
              Excluir contrato
            </Button>
          )}
        </div>
      </Card>

      <VehicleCard veiculo={veiculo} contrato={contrato} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Parcelas</h2>
        <ParcelasTable
          parcelas={parcelas}
          parametros={parametros}
          variant="admin"
          onVisualizar={setParcelaDetalhe}
        />
      </div>

      <ParcelaDetalheDialog
        parcela={parcelaDetalhe}
        parametros={parametros}
        open={parcelaDetalhe !== null}
        onOpenChange={(open) => !open && setParcelaDetalhe(null)}
        podeAplicarDesconto
        onAplicarDesconto={handleAplicarDesconto}
        podeDarBaixa
        onDarBaixa={handleDarBaixa}
      />

      <Dialog open={editandoContrato} onOpenChange={setEditandoContrato}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar contrato {contrato.numero}</DialogTitle>
            <DialogDescription>
              Só os campos abaixo podem ser alterados diretamente — cliente, veículo e datas ficam
              fixos porque já foram usados para gerar o cronograma de parcelas e o contrato
              assinado. Mudar o valor da parcela vale só pras parcelas seguintes — as já geradas
              mantêm o valor com que foram criadas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarContrato} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contrato-numero">Número do contrato</Label>
              <Input
                id="contrato-numero"
                value={numeroEdicao}
                onChange={(e) => setNumeroEdicao(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contrato-valorParcela">Valor da parcela semanal</Label>
              <Input
                id="contrato-valorParcela"
                type="number"
                step="0.01"
                min="0"
                value={valorParcelaEdicao}
                onChange={(e) => setValorParcelaEdicao(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contrato-caucao">Valor da caução</Label>
              <Input
                id="contrato-caucao"
                type="number"
                step="0.01"
                min="0"
                value={caucaoEdicao}
                onChange={(e) => setCaucaoEdicao(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contrato-limiteRenovacao">Limite de renovação</Label>
              <Input
                id="contrato-limiteRenovacao"
                type="number"
                min="0"
                value={limiteRenovacaoEdicao}
                onChange={(e) => setLimiteRenovacaoEdicao(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditandoContrato(false)}
                disabled={salvandoContrato}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoContrato}>
                {salvandoContrato ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmandoEncerramento} onOpenChange={setConfirmandoEncerramento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar contrato {contrato.numero}?</DialogTitle>
            <DialogDescription>
              Como este é um contrato de prazo indeterminado, o encerramento é definitivo: o
              status passa para <strong>Encerrado</strong>, a data de término é fixada em hoje e as
              parcelas em aberto com vencimento futuro são canceladas. Essa ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmandoEncerramento(false)}
              disabled={encerrando}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmarEncerramento} disabled={encerrando}>
              {encerrando ? "Encerrando…" : "Sim, encerrar contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmandoExclusao}
        onOpenChange={(open) => {
          setConfirmandoExclusao(open);
          if (!open) {
            setNumeroDigitado("");
            setAvisoAcordoExclusao(null);
          }
        }}
      >
        <DialogContent>
          {avisoAcordoExclusao ? (
            <>
              <DialogHeader>
                <DialogTitle>Este contrato tem um acordo vinculado</DialogTitle>
                <DialogDescription>{avisoAcordoExclusao}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmandoExclusao(false)}
                  disabled={excluindo}
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleConfirmarExclusao} disabled={excluindo}>
                  {excluindo ? "Excluindo…" : "Sim, excluir mesmo assim"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirme digitando o número do contrato</DialogTitle>
                <DialogDescription>
                  Essa ação é definitiva e não pode ser desfeita: apaga o contrato e tudo vinculado a
                  ele (parcelas, extrato, multas, acordo, documentos). Use só para contratos criados
                  errados — o servidor recusa se houver qualquer parcela ou multa já paga, ou um
                  acordo com pagamentos registrados. Para confirmar, digite{" "}
                  <strong className="text-foreground">{contrato.numero}</strong> abaixo.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmacaoNumero">Número do contrato</Label>
                <Input
                  id="confirmacaoNumero"
                  value={numeroDigitado}
                  onChange={(e) => setNumeroDigitado(e.target.value)}
                  placeholder={contrato.numero}
                  autoComplete="off"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmandoExclusao(false)} disabled={excluindo}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmarExclusao}
                  disabled={excluindo || numeroDigitado.trim() !== contrato.numero}
                >
                  {excluindo ? "Excluindo…" : "Excluir definitivamente"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmandoBloqueio} onOpenChange={setConfirmandoBloqueio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {veiculo.bloqueado ? "Desbloquear" : "Bloquear"} o veículo {veiculo.placa}?
            </DialogTitle>
            <DialogDescription>
              {veiculo.bloqueado
                ? "O veículo volta a ficar liberado para uso. O contrato não é afetado."
                : "O veículo fica impedido de uso até ser desbloqueado. O contrato continua rodando normalmente — parcelas, prazo e status não são alterados."}
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
                  ? "Sim, desbloquear"
                  : "Sim, bloquear carro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
