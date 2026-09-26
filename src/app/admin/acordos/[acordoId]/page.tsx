"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, FileCheck2, FileDown, Pencil, Printer, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import {
  atualizarAcordo,
  buscarAcordoPorId,
  encerrarAcordo,
  excluirAcordo,
  reenviarAcordoParaAssinatura,
} from "@/lib/services/acordos.service";
import { buscarClientePorId } from "@/lib/services/clientes.service";
import { buscarContratoPorId } from "@/lib/services/contratos.service";
import { buscarVeiculoPorId } from "@/lib/services/veiculos.service";
import {
  aplicarDescontoParcelaAcordo,
  darBaixaManualAcordo,
  type BaixaManualAcordoInput,
  type DescontoParcelaAcordoInput,
} from "@/lib/services/financeiro-acordos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";
import { assinaturaConcluida } from "@/lib/utils/assinatura";
import type { Acordo, Cliente, Contrato, ParcelaAcordo, StatusAcordo, Veiculo } from "@/lib/types";

import { VehicleCard } from "@/components/shared/vehicle-card";
import { ParcelasAcordoTable } from "@/components/shared/parcelas-acordo-table";
import { ParcelaAcordoDetalheDialog } from "@/components/shared/parcela-acordo-detalhe-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const SITUACOES_ACORDO: { value: StatusAcordo; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "quitado", label: "Quitado" },
  { value: "rompido", label: "Rompido" },
];

export default function AdminAcordoDetalhePage() {
  const params = useParams<{ acordoId: string }>();
  const router = useRouter();
  const { usuario } = useAuth();
  const [acordo, setAcordo] = React.useState<Acordo | null>(null);
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [contrato, setContrato] = React.useState<Contrato | null>(null);
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [parcelaDetalhe, setParcelaDetalhe] = React.useState<ParcelaAcordo | null>(null);
  const [editandoAcordo, setEditandoAcordo] = React.useState(false);
  const [descricaoEdicao, setDescricaoEdicao] = React.useState("");
  const [situacaoEdicao, setSituacaoEdicao] = React.useState<StatusAcordo>("ativo");
  const [salvandoAcordo, setSalvandoAcordo] = React.useState(false);
  const [enviandoAssinatura, setEnviandoAssinatura] = React.useState(false);
  const [confirmandoEncerramento, setConfirmandoEncerramento] = React.useState(false);
  const [encerrando, setEncerrando] = React.useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = React.useState(false);
  const [numeroDigitado, setNumeroDigitado] = React.useState("");
  const [excluindo, setExcluindo] = React.useState(false);

  React.useEffect(() => {
    buscarAcordoPorId(params.acordoId).then(async (a) => {
      setAcordo(a ?? null);
      if (!a) return;
      const [clienteEncontrado, contratoEncontrado] = await Promise.all([
        buscarClientePorId(a.clienteId),
        buscarContratoPorId(a.contratoId),
      ]);
      setCliente(clienteEncontrado ?? null);
      setContrato(contratoEncontrado ?? null);
      if (contratoEncontrado) {
        const veiculoEncontrado = await buscarVeiculoPorId(contratoEncontrado.veiculoId);
        setVeiculo(veiculoEncontrado ?? null);
      }
    });
  }, [params.acordoId]);

  function abrirEdicao() {
    if (!acordo) return;
    setDescricaoEdicao(acordo.descricao ?? "");
    setSituacaoEdicao(acordo.situacao);
    setEditandoAcordo(true);
  }

  async function handleSalvarAcordo(event: React.FormEvent) {
    event.preventDefault();
    if (!acordo) return;
    setSalvandoAcordo(true);
    try {
      const atualizado = await atualizarAcordo(acordo.id, {
        descricao: descricaoEdicao,
        situacao: situacaoEdicao,
      });
      setAcordo(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Editou os dados do acordo",
          entidade: "Acordo",
          entidadeId: atualizado.numero,
        });
      }
      toast.success("Dados do acordo atualizados com sucesso!");
      setEditandoAcordo(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o acordo.");
    } finally {
      setSalvandoAcordo(false);
    }
  }

  async function handleEnviarAssinatura() {
    if (!acordo) return;
    setEnviandoAssinatura(true);
    try {
      const atualizado = await reenviarAcordoParaAssinatura(acordo.id);
      setAcordo(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Enviou o acordo para assinatura eletrônica",
          entidade: "Acordo",
          entidadeId: atualizado.numero,
        });
      }
      toast.success("Acordo enviado para assinatura — o cliente vai receber um e-mail da ClickSign.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar para assinatura.");
    } finally {
      setEnviandoAssinatura(false);
    }
  }

  async function handleConfirmarEncerramento() {
    if (!acordo) return;
    setEncerrando(true);
    try {
      const atualizado = await encerrarAcordo(acordo.id);
      setAcordo(atualizado);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Encerrou o acordo",
          entidade: "Acordo",
          entidadeId: acordo.numero,
        });
      }
      toast.success("Acordo encerrado com sucesso.");
      setConfirmandoEncerramento(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar o acordo.");
    } finally {
      setEncerrando(false);
    }
  }

  async function handleConfirmarExclusao() {
    if (!acordo) return;
    setExcluindo(true);
    try {
      await excluirAcordo(acordo.id);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Excluiu o acordo (criado errado)",
          entidade: "Acordo",
          entidadeId: acordo.numero,
        });
      }
      toast.success("Acordo excluído com sucesso.");
      router.push("/admin/acordos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o acordo.");
      setExcluindo(false);
    }
  }

  async function handleAplicarDesconto(parcelaAcordoId: string, desconto: DescontoParcelaAcordoInput) {
    if (!acordo) return;
    try {
      const atualizada = await aplicarDescontoParcelaAcordo(parcelaAcordoId, desconto, usuario?.nome ?? "Administrador");
      setAcordo({
        ...acordo,
        cronograma: acordo.cronograma.map((p) => (p.id === atualizada.id ? atualizada : p)),
      });
      setParcelaDetalhe(atualizada);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Aplicou desconto numa parcela de acordo",
          entidade: "Parcela de acordo",
          entidadeId: `${acordo.numero} · parcela ${atualizada.numero}`,
        });
      }
      toast.success(atualizada.desconto ? "Desconto aplicado com sucesso." : "Desconto removido.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar o desconto.");
    }
  }

  async function handleDarBaixa(parcelaAcordoId: string, dados: BaixaManualAcordoInput) {
    if (!acordo) return;
    try {
      const atualizada = await darBaixaManualAcordo(parcelaAcordoId, dados, usuario?.nome ?? "Administrador");
      setAcordo({
        ...acordo,
        cronograma: acordo.cronograma.map((p) => (p.id === atualizada.id ? atualizada : p)),
      });
      setParcelaDetalhe(atualizada);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Deu baixa manual num pagamento de acordo",
          entidade: "Parcela de acordo",
          entidadeId: `${acordo.numero} · parcela ${atualizada.numero}`,
        });
      }
      toast.success("Baixa registrada — a parcela já está marcada como paga.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível dar baixa no pagamento.");
    }
  }

  if (!acordo) return <Skeleton className="h-96 w-full" />;

  const percentualJuros = acordo.valorDividaOriginal
    ? ((acordo.valorTotal - acordo.valorDividaOriginal) / acordo.valorDividaOriginal) * 100
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex-row items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Acordo</p>
            <h1 className="text-lg font-semibold text-foreground">{acordo.numero}</h1>
          </div>
          {cliente && (
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <Link
                href={`/admin/clientes/${cliente.id}`}
                className="text-lg font-semibold text-foreground hover:text-gold"
              >
                {cliente.nome}
              </Link>
            </div>
          )}
          {acordo.assinatura && (
            <div>
              <p className="text-xs text-muted-foreground">Assinatura eletrônica</p>
              {assinaturaConcluida(acordo.assinatura.status) ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="success">
                    <FileCheck2 className="size-3" />
                    Assinado
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    em {formatDateTime(acordo.assinatura.atualizadoEm ?? acordo.assinatura.enviadoEm)}
                  </span>
                </div>
              ) : (
                <Badge variant="warning">{acordo.assinatura.status}</Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {acordo.assinatura && assinaturaConcluida(acordo.assinatura.status) && acordo.arquivoUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={acordo.arquivoUrl} target="_blank" rel="noreferrer">
                <FileDown className="size-4" />
                Documento assinado
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/imprimir/acordo/${acordo.id}`}>
              <Printer className="size-4" />
              Imprimir acordo
            </Link>
          </Button>
          {usuario?.perfil === "administrador" && (
            <Button size="sm" variant="outline" onClick={abrirEdicao}>
              <Pencil className="size-4" />
              Editar acordo
            </Button>
          )}
          {!acordo.assinatura && (
            <Button size="sm" variant="outline" onClick={handleEnviarAssinatura} disabled={enviandoAssinatura}>
              <Send className="size-4" />
              {enviandoAssinatura ? "Enviando…" : "Enviar p/ assinatura"}
            </Button>
          )}
          {acordo.situacao === "ativo" && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmandoEncerramento(true)}>
              <AlertTriangle className="size-4" />
              Encerrar acordo
            </Button>
          )}
          {acordo.situacao === "encerrado" && usuario?.perfil === "administrador" && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmandoExclusao(true)}>
              <Trash2 className="size-4" />
              Excluir acordo
            </Button>
          )}
        </div>
      </Card>

      {veiculo && contrato && <VehicleCard veiculo={veiculo} contrato={contrato} />}

      <Card>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Situação</dt>
            <dd className="font-medium text-foreground capitalize">{acordo.situacao}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Data de início</dt>
            <dd className="font-medium text-foreground">{formatDate(acordo.dataInicio)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Entrada</dt>
            <dd className="font-medium text-foreground">{formatCurrency(acordo.valorEntrada)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Valor total</dt>
            <dd className="font-medium text-gold">{formatCurrency(acordo.valorTotal)}</dd>
          </div>
          {acordo.valorDividaOriginal !== undefined && (
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Dívida original</dt>
              <dd className="font-medium text-foreground">{formatCurrency(acordo.valorDividaOriginal)}</dd>
            </div>
          )}
          {percentualJuros !== null && (
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Acréscimo</dt>
              <dd className="font-medium text-foreground">
                {percentualJuros.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Periodicidade</dt>
            <dd className="font-medium text-foreground capitalize">{acordo.periodicidade}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase text-muted-foreground">Parcelas</dt>
            <dd className="font-medium text-foreground">{acordo.cronograma.length}x</dd>
          </div>
        </dl>
        {acordo.descricao && (
          <p className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
            {acordo.descricao}
          </p>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Cronograma de parcelas</h2>
        <ParcelasAcordoTable parcelas={acordo.cronograma} onVisualizar={setParcelaDetalhe} />
      </div>

      <ParcelaAcordoDetalheDialog
        parcela={parcelaDetalhe}
        open={parcelaDetalhe !== null}
        onOpenChange={(open) => !open && setParcelaDetalhe(null)}
        podeAplicarDesconto
        onAplicarDesconto={handleAplicarDesconto}
        podeDarBaixa
        onDarBaixa={handleDarBaixa}
      />

      <Dialog open={editandoAcordo} onOpenChange={setEditandoAcordo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar acordo {acordo.numero}</DialogTitle>
            <DialogDescription>
              Só descrição e situação podem ser alteradas diretamente — valores, periodicidade e
              vínculo com cliente/contrato ficam fixos porque já foram usados para gerar o
              cronograma de parcelas do acordo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarAcordo} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acordo-descricao">Descrição</Label>
              <Textarea
                id="acordo-descricao"
                value={descricaoEdicao}
                onChange={(e) => setDescricaoEdicao(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Situação</Label>
              <div className="flex flex-wrap gap-2">
                {SITUACOES_ACORDO.map((situacao) => (
                  <Button
                    key={situacao.value}
                    type="button"
                    size="sm"
                    variant={situacaoEdicao === situacao.value ? "default" : "outline"}
                    onClick={() => setSituacaoEdicao(situacao.value)}
                  >
                    {situacao.label}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditandoAcordo(false)}
                disabled={salvandoAcordo}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoAcordo}>
                {salvandoAcordo ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmandoEncerramento} onOpenChange={setConfirmandoEncerramento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar acordo {acordo.numero}?</DialogTitle>
            <DialogDescription>
              O encerramento é definitivo: o status passa para <strong>Encerrado</strong> e as
              parcelas em aberto com vencimento futuro são canceladas (as já vencidas continuam
              registradas como histórico). Essa ação não pode ser desfeita.
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
              {encerrando ? "Encerrando…" : "Sim, encerrar acordo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmandoExclusao}
        onOpenChange={(open) => {
          setConfirmandoExclusao(open);
          if (!open) setNumeroDigitado("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirme digitando o número do acordo</DialogTitle>
            <DialogDescription>
              Essa ação é definitiva e não pode ser desfeita: apaga o acordo e tudo vinculado a
              ele (parcelas, pagamentos parciais, documentos). Use só para acordos criados
              errados — o servidor recusa se houver qualquer parcela paga. Para confirmar, digite{" "}
              <strong className="text-foreground">{acordo.numero}</strong> abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmacaoNumeroAcordo">Número do acordo</Label>
            <Input
              id="confirmacaoNumeroAcordo"
              value={numeroDigitado}
              onChange={(e) => setNumeroDigitado(e.target.value)}
              placeholder={acordo.numero}
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
              disabled={excluindo || numeroDigitado.trim() !== acordo.numero}
            >
              {excluindo ? "Excluindo…" : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
