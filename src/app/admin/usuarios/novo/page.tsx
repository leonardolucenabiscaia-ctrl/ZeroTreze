"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { RoleGuard } from "@/lib/auth/route-guards";
import { useAuth } from "@/lib/auth/auth-context";
import { criarUsuarioInterno } from "@/lib/services/usuarios.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { formatPhone } from "@/lib/utils/formatters";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const usuarioSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo").max(100),
  email: z.string().trim().email("E-mail inválido").max(100),
  telefone: z.string().trim().min(14, "Telefone inválido").max(15),
  perfil: z.enum(["gestor", "operador"], { message: "Selecione o nível de acesso" }),
});

type UsuarioFormValues = z.infer<typeof usuarioSchema>;

function NovoUsuarioConteudo() {
  const router = useRouter();
  const { usuario: usuarioLogado } = useAuth();
  const [enviando, setEnviando] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
  });

  const telefoneField = register("telefone");

  async function onSubmit(values: UsuarioFormValues) {
    setEnviando(true);
    try {
      const usuario = await criarUsuarioInterno(values);
      if (usuarioLogado) {
        await registrarAcao({
          usuarioId: usuarioLogado.id,
          usuarioNome: usuarioLogado.nome,
          acao: `Cadastrou um novo ${values.perfil}`,
          entidade: "Usuário",
          entidadeId: usuario.nome,
        });
      }
      toast.success(`${values.perfil === "gestor" ? "Gestor" : "Operador"} cadastrado com sucesso!`);
      router.push("/admin/usuarios");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o usuário.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Adicionar usuário</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre um novo gestor ou operador. Um convite é enviado por WhatsApp para que a pessoa
          defina a própria senha no primeiro acesso.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados do usuário</CardTitle>
          <CardDescription>Telefone é usado para o convite de primeiro acesso por WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Campo label="Nome completo" erro={errors.nome?.message}>
              <Input {...register("nome")} placeholder="Nome do gestor ou operador" />
            </Campo>

            <Campo label="E-mail" erro={errors.email?.message}>
              <Input {...register("email")} type="email" placeholder="nome@zerotreze.com.br" />
            </Campo>

            <Campo label="Telefone" erro={errors.telefone?.message}>
              <Input
                {...telefoneField}
                placeholder="(11) 90000-0000"
                maxLength={15}
                onChange={(e) => {
                  e.target.value = formatPhone(e.target.value);
                  telefoneField.onChange(e);
                }}
              />
            </Campo>

            <Campo label="Nível de acesso" erro={errors.perfil?.message}>
              <Controller
                control={control}
                name="perfil"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/usuarios")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Cadastrando…" : "Cadastrar usuário"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({
  label,
  erro,
  children,
}: {
  label: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}

export default function NovoUsuarioPage() {
  return (
    <RoleGuard perfisPermitidos={["administrador"]} redirecionarPara="/admin/dashboard">
      <NovoUsuarioConteudo />
    </RoleGuard>
  );
}
