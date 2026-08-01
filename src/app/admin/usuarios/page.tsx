"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/lib/auth/route-guards";
import { useAuth } from "@/lib/auth/auth-context";
import { listarUsuariosInternos, atualizarPerfilAcesso } from "@/lib/services/usuarios.service";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PERFIS: { value: PerfilUsuario; label: string }[] = [
  { value: "operador", label: "Operador" },
  { value: "gestor", label: "Gestor" },
  { value: "administrador", label: "Administrador" },
];

function AdminUsuariosConteudo() {
  const { usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = React.useState<Usuario[] | null>(null);

  React.useEffect(() => {
    listarUsuariosInternos().then(setUsuarios);
  }, []);

  async function handleAlterarPerfil(id: string, perfil: PerfilUsuario) {
    const atualizado = await atualizarPerfilAcesso(id, perfil);
    setUsuarios((atuais) => atuais!.map((u) => (u.id === id ? atualizado : u)));
    toast.success("Perfil de acesso atualizado.");
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => (
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
                  <Select
                    value={usuario.perfil}
                    onValueChange={(v) => handleAlterarPerfil(usuario.id, v as PerfilUsuario)}
                    disabled={!podeEditar}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERFIS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
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
