"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { enviarNotificacaoCobranca } from "@/lib/services/cobranca.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDocument } from "@/lib/utils/formatters";
import type { Cliente } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CANAIS = [
  { value: "email", label: "E-mail" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

const notificacaoSchema = z
  .object({
    destinatario: z.enum(["cliente_especifico", "todos_em_atraso"]),
    clienteId: z.string().optional(),
    titulo: z.string().trim().min(3, "Informe um título").max(100),
    descricao: z.string().trim().min(3, "Descreva a notificação").max(1000),
    canais: z.array(z.enum(["email", "sms", "whatsapp"])).min(1, "Selecione ao menos um canal"),
  })
  .refine((valores) => valores.destinatario !== "cliente_especifico" || !!valores.clienteId, {
    message: "Selecione o cliente",
    path: ["clienteId"],
  });

type NotificacaoFormValues = z.infer<typeof notificacaoSchema>;

export default function NovaNotificacaoCobrancaPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    listarClientes().then((carregados) => {
      setClientes(carregados);
      setCarregando(false);
    });
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<NotificacaoFormValues>({
    resolver: zodResolver(notificacaoSchema),
    defaultValues: { destinatario: "cliente_especifico", canais: [] },
  });

  const destinatario = watch("destinatario");

  async function onSubmit(values: NotificacaoFormValues) {
    setEnviando(true);
    try {
      const resultado = await enviarNotificacaoCobranca(
        {
          titulo: values.titulo,
          descricao: values.descricao,
          canais: values.canais,
          destinatario: values.destinatario,
          clienteId: values.destinatario === "cliente_especifico" ? values.clienteId : undefined,
        },
        usuario?.nome ?? "Administrador"
      );

      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Enviou uma notificação de cobrança",
          entidade: "Notificação de cobrança",
          entidadeId: resultado.titulo,
        });
      }

      toast.success(
        resultado.clientesAlcancados === 1
          ? "Notificação enviada para 1 cliente."
          : `Notificação enviada para ${resultado.clientesAlcancados} clientes.`
      );
      router.push("/admin/cobranca");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a notificação.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Nova notificação de cobrança</h1>
        <p className="text-sm text-muted-foreground">
          Envie uma notificação avulsa para um cliente específico ou para todos os clientes em
          atraso no momento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados da notificação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Campo label="Destinatário">
              <Controller
                control={control}
                name="destinatario"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente_especifico">Um cliente específico</SelectItem>
                      <SelectItem value="todos_em_atraso">Todos os clientes em atraso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>

            {destinatario === "cliente_especifico" && (
              <Campo label="Cliente" erro={errors.clienteId?.message}>
                <Controller
                  control={control}
                  name="clienteId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome} — {formatDocument(cliente.documento)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Campo>
            )}

            <Campo label="Título" erro={errors.titulo?.message}>
              <Input {...register("titulo")} placeholder="Ex.: Regularize sua situação" />
            </Campo>

            <Campo label="Descrição" erro={errors.descricao?.message}>
              <Textarea
                {...register("descricao")}
                placeholder="Escreva a mensagem que o cliente vai receber…"
                rows={4}
              />
            </Campo>

            <Campo label="Enviar por" erro={errors.canais?.message}>
              <Controller
                control={control}
                name="canais"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    {CANAIS.map((canal) => {
                      const marcado = field.value?.includes(canal.value);
                      return (
                        <label
                          key={canal.value}
                          className="flex items-center gap-2 text-sm text-foreground"
                        >
                          <Checkbox
                            checked={marcado}
                            onCheckedChange={(valor) => {
                              const atual = field.value ?? [];
                              field.onChange(
                                valor ? [...atual, canal.value] : atual.filter((c) => c !== canal.value)
                              );
                            }}
                          />
                          {canal.label}
                        </label>
                      );
                    })}
                  </div>
                )}
              />
            </Campo>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/cobranca")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Enviando…" : "Enviar notificação"}
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
