"use client";

import * as React from "react";
import Link from "next/link";
import { Handshake, Pencil, Plus, Printer } from "lucide-react";
import { toast } from "sonner";

import { atualizarAcordo, listarAcordos } from "@/lib/services/acordos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCurrency } from "@/lib/utils/formatters";
import type { Acordo, Cliente, StatusAcordo } from "@/lib/types";

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
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
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

export default function AdminAcordosPage() {
  const { usuario } = useAuth();
  const [acordos, setAcordos] = React.useState<Acordo[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [acordoEdicao, setAcordoEdicao] = React.useState<Acordo | null>(null);
  const [descricaoEdicao, setDescricaoEdicao] = React.useState("");
  const [situacaoEdicao, setSituacaoEdicao] = React.useState<StatusAcordo>("ativo");
  const [salvandoAcordo, setSalvandoAcordo] = React.useState(false);

  React.useEffect(() => {
    listarAcordos().then(setAcordos);
    listarClientes().then(setClientes);
  }, []);

  function abrirEdicaoAcordo(acordo: Acordo) {
    setAcordoEdicao(acordo);
    setDescricaoEdicao(acordo.descricao ?? "");
    setSituacaoEdicao(acordo.situacao);
  }

  async function handleSalvarAcordo(event: React.FormEvent) {
    event.preventDefault();
    if (!acordoEdicao) return;
    setSalvandoAcordo(true);
    try {
      const atualizado = await atualizarAcordo(acordoEdicao.id, {
        descricao: descricaoEdicao,
        situacao: situacaoEdicao,
      });
      setAcordos((atuais) => (atuais ?? []).map((a) => (a.id === atualizado.id ? atualizado : a)));
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
      setAcordoEdicao(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o acordo.");
    } finally {
      setSalvandoAcordo(false);
    }
  }

  if (!acordos) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Acordos</h1>
        <Button asChild size="sm">
          <Link href="/admin/acordos/novo">
            <Plus className="size-4" />
            Novo acordo
          </Link>
        </Button>
      </div>

      {acordos.length === 0 ? (
        <EmptyState icon={Handshake} title="Nenhum acordo registrado" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor total</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {acordos.map((acordo) => (
              <TableRow key={acordo.id}>
                <TableCell className="font-medium">{acordo.numero}</TableCell>
                <TableCell>{clientes.find((c) => c.id === acordo.clienteId)?.nome ?? "—"}</TableCell>
                <TableCell>{formatCurrency(acordo.valorTotal)}</TableCell>
                <TableCell>{formatCurrency(acordo.valorEntrada)}</TableCell>
                <TableCell>{acordo.cronograma.length}x</TableCell>
                <TableCell>
                  <StatusPill status={acordo.situacao} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {usuario?.perfil === "administrador" && (
                      <Button size="sm" variant="outline" onClick={() => abrirEdicaoAcordo(acordo)}>
                        <Pencil className="size-4" />
                        Editar
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/imprimir/acordo/${acordo.id}`}>
                        <Printer className="size-4" />
                        Imprimir
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={acordoEdicao !== null} onOpenChange={(open) => !open && setAcordoEdicao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar acordo {acordoEdicao?.numero}</DialogTitle>
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
                onClick={() => setAcordoEdicao(null)}
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
    </div>
  );
}
