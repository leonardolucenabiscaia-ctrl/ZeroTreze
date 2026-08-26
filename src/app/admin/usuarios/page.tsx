"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/lib/auth/route-guards";
import { useAuth } from "@/lib/auth/auth-context";
import { listarUsuariosInternos, atualizarPerfilAcesso, excluirUsuario } from "@/lib/services/usuarios.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import type { PerfilUsuario, Usuario } from "@/lib/types";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectBusca } from "@/components/ui/select-busca";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PERFIS: { value: PerfilUsuario; label: string }[] = [
  { value: "operador", label: "Operador" },
  { value: "gestor", label: "Gestor" },
  { value: "administrador", label: "Administrador" },
];

function AdminUsuariosConteudo() {
  const { usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = React.useState<Usuario[] | null>(null);
  const [removendo, setRemovendo] = React.useState<Usuario | null>(null);
  const [nomeDigitado, setNomeDigitado] = React.useState("");
  const [excluindo, setExcluindo] = React.useState(false);

  React.useEffect(() => {
    listarUsuariosInternos().then(setUsuarios);
  }, []);

  async function handleAlterarPerfil(id: string, perfil: PerfilUsuario) {
    const atualizado = await atualizarPerfilAcesso(id, perfil);
    setUsuarios((atuais) => atuais!.map((u) => (u.id === id ? atualizado : u)));
    toast.success("Perfil de acesso atualizado.");
  }

  function fecharDialogRemocao() {
    setRemovendo(null);
    setNomeDigitado("");
  }

  async function handleConfirmarRemocao() {
    if (!removendo) return;
    setExcluindo(true);
    try {
      await excluirUsuario(removendo.id);
      if (usuarioLogado) {
        await registrarAcao({
          usuarioId: usuarioLogado.id,
          usuarioNome: usuarioLogado.nome,
          acao: "Removeu o usuário interno",
          entidade: "Usuário",
          entidadeId: `${removendo.nome} (${removendo.email})`,
        });
      }
      setUsuarios((atuais) => (atuais ?? []).filter((u) => u.id !== removendo.id));
      toast.success("Usuário removido com sucesso.");
      fecharDialogRemocao();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o usuário.");
    } finally {
      setExcluindo(false);
    }
  }

  if (!usuarios) return <Skeleton className="h-96 w-full" />;
  const podeEditar = usuarioLogado?.perfil === "administrador";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Usuários</h1>
        <Button asChild size="sm">
          <Link href="/admin/usuarios/novo">
            <Plus className="size-4" />
            Adicionar usuário
          </Link>
        </Button>
      </div>

      {usuarios.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário interno" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => {
              const souEu = usuario.id === usuarioLogado?.id;
              return (
                <TableRow key={usuario.id}>
                  <TableCell className="flex items-center gap-2 font-medium">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">
                        {usuario.nome.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {usuario.nome}
                  </TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>
                    <SelectBusca
                      value={usuario.perfil}
                      onValueChange={(v) => handleAlterarPerfil(usuario.id, v as PerfilUsuario)}
                      disabled={!podeEditar}
                      searchPlaceholder="Buscar…"
                      className="w-40"
                      options={PERFIS.map((p) => ({ value: p.value, label: p.label }))}
                    />
                  </TableCell>
                  <TableCell>
                    {podeEditar && !souEu && (
                      <Button size="sm" variant="outline" onClick={() => setRemovendo(usuario)}>
                        <Trash2 className="size-3.5" />
                        Remover
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={removendo !== null} onOpenChange={(open) => !open && fecharDialogRemocao()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirme digitando o nome do usuário</DialogTitle>
            <DialogDescription>
              Essa ação é definitiva e não pode ser desfeita — remove o acesso de{" "}
              <strong className="text-foreground">{removendo?.nome}</strong> ao backoffice. Para
              confirmar, digite o nome completo abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmacaoNomeUsuario">Nome do usuário</Label>
            <Input
              id="confirmacaoNomeUsuario"
              value={nomeDigitado}
              onChange={(e) => setNomeDigitado(e.target.value)}
              placeholder={removendo?.nome}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharDialogRemocao} disabled={excluindo}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarRemocao}
              disabled={excluindo || nomeDigitado.trim() !== removendo?.nome}
            >
              {excluindo ? "Removendo…" : "Remover definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminUsuariosPage() {
  return (
    <RoleGuard perfisPermitidos={["administrador"]} redirecionarPara="/admin/dashboard">
      <AdminUsuariosConteudo />
    </RoleGuard>
  );
}
