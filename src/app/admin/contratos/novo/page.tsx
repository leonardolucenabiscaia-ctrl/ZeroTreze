"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { criarContrato, listarContratos } from "@/lib/services/contratos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { listarVeiculos } from "@/lib/services/veiculos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDocument } from "@/lib/utils/formatters";
import type { Cliente, Contrato, Veiculo } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const contratoSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente"),
  veiculoId: z.string().min(1, "Selecione o veículo"),
  valorSemanal: z.number().positive("Informe um valor semanal válido"),
  dataInicio: z.string().min(1, "Informe a data de início"),
  caucao: z.number().min(0, "Informe um valor de caução válido"),
});

type ContratoFormValues = z.infer<typeof contratoSchema>;

export default function NovoContratoPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = React.useState<Veiculo[]>([]);
  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    Promise.all([listarClientes(), listarVeiculos(), listarContratos()]).then(
      ([clientesCarregados, veiculosCarregados, contratosCarregados]) => {
        setClientes(clientesCarregados);
        setVeiculos(veiculosCarregados);
        setContratos(contratosCarregados);
        setCarregando(false);
      }
    );
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ContratoFormValues>({
    resolver: zodResolver(contratoSchema),
  });

  const veiculosOcupadosIds = new Set(
    contratos.filter((c) => c.status !== "encerrado").map((c) => c.veiculoId)
  );

  async function onSubmit(values: ContratoFormValues) {
    setEnviando(true);
    try {
      const contrato = await criarContrato(values);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Gerou o contrato",
          entidade: "Contrato",
          entidadeId: contrato.numero,
        });
      }
      toast.success("Contrato iniciado com sucesso!");
      router.push(`/admin/contratos/${contrato.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o contrato.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Iniciar novo contrato</h1>
        <p className="text-sm text-muted-foreground">
          O prazo mínimo é de 6 meses e as parcelas são geradas automaticamente, semanais, com
          vencimento toda segunda-feira até 23h59.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados do contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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

            <Campo label="Veículo" erro={errors.veiculoId?.message}>
              <Controller
                control={control}
                name="veiculoId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {veiculos.map((veiculo) => (
                        <SelectItem key={veiculo.id} value={veiculo.id}>
                          {veiculo.marca} {veiculo.modelo} — {veiculo.placa}
                          {veiculosOcupadosIds.has(veiculo.id) ? " (em uso)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Valor semanal" erro={errors.valorSemanal?.message}>
                <Input
                  {...register("valorSemanal", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="800,00"
                />
              </Campo>

              <Campo label="Caução" erro={errors.caucao?.message}>
                <Input
                  {...register("caucao", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="1500,00"
                />
              </Campo>
            </div>

            <Campo label="Data de início" erro={errors.dataInicio?.message}>
              <Input {...register("dataInicio")} type="date" />
            </Campo>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/contratos")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Iniciando…" : "Iniciar contrato"}
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
