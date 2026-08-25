"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { criarMulta } from "@/lib/services/multas.service";
import { listarContratos } from "@/lib/services/contratos.service";
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
import { SelectBusca } from "@/components/ui/select-busca";

const hoje = new Date().toISOString().slice(0, 10);

const multaSchema = z
  .object({
    clienteId: z.string().min(1, "Selecione o cliente"),
    contratoId: z.string().min(1, "Selecione o carro (contrato)"),
    numeroAuto: z.string().min(1, "Informe o número do auto de infração"),
    orgao: z.string().min(1, "Informe o órgão autuador"),
    descricao: z.string().min(1, "Descreva a infração"),
    valor: z.number().positive("Informe um valor válido"),
    pontos: z.number().int().min(0, "Informe a pontuação").max(20, "Máximo de 20 pontos"),
    data: z.string().min(1, "Informe a data da infração"),
    vencimento: z.string().min(1, "Informe o vencimento"),
    dataRegistro: z.string().min(1, "Informe a data de entrada na plataforma"),
  })
  .refine((valores) => !valores.data || !valores.vencimento || valores.vencimento >= valores.data, {
    message: "O vencimento não pode ser anterior à data da infração",
    path: ["vencimento"],
  });

type MultaFormValues = z.infer<typeof multaSchema>;

export default function NovaMultaPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [veiculos, setVeiculos] = React.useState<Veiculo[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    Promise.all([listarClientes(), listarContratos(), listarVeiculos()]).then(
      ([clientesCarregados, contratosCarregados, veiculosCarregados]) => {
        setClientes(clientesCarregados);
        setContratos(contratosCarregados);
        setVeiculos(veiculosCarregados);
        setCarregando(false);
      }
    );
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MultaFormValues>({
    resolver: zodResolver(multaSchema),
    defaultValues: { dataRegistro: hoje, pontos: 0 },
  });

  const clienteId = watch("clienteId");

  const contratosDoCliente = contratos.filter((c) => c.clienteId === clienteId);

  function nomeCarro(contrato: Contrato) {
    const veiculo = veiculos.find((v) => v.id === contrato.veiculoId);
    return veiculo ? `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}` : contrato.numero;
  }

  async function onSubmit(values: MultaFormValues) {
    setEnviando(true);
    try {
      const multa = await criarMulta({
        contratoId: values.contratoId,
        numeroAuto: values.numeroAuto,
        orgao: values.orgao,
        descricao: values.descricao,
        valor: values.valor,
        data: values.data,
        vencimento: values.vencimento,
        dataRegistro: values.dataRegistro,
        pontos: values.pontos,
      });
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Registrou uma multa",
          entidade: "Multa",
          entidadeId: multa.numeroAuto,
        });
      }
      toast.success("Multa registrada com sucesso!");
      router.push("/admin/multas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar a multa.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Adicionar multa</h1>
        <p className="text-sm text-muted-foreground">
          O cliente é notificado automaticamente assim que a multa é registrada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados da multa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Campo label="Cliente" erro={errors.clienteId?.message}>
              <Controller
                control={control}
                name="clienteId"
                render={({ field }) => (
                  <SelectBusca
                    value={field.value}
                    onValueChange={(valor) => {
                      field.onChange(valor);
                      setValue("contratoId", "");
                    }}
                    placeholder="Selecione o cliente"
                    searchPlaceholder="Buscar cliente…"
                    options={clientes.map((cliente) => ({
                      value: cliente.id,
                      label: `${cliente.nome} — ${formatDocument(cliente.documento)}`,
                    }))}
                  />
                )}
              />
            </Campo>

            <Campo label="Carro (contrato)" erro={errors.contratoId?.message}>
              <Controller
                control={control}
                name="contratoId"
                render={({ field }) => (
                  <SelectBusca
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!clienteId}
                    placeholder={clienteId ? "Selecione o carro" : "Selecione o cliente primeiro"}
                    searchPlaceholder="Buscar carro…"
                    options={contratosDoCliente.map((contrato) => ({
                      value: contrato.id,
                      label: `${nomeCarro(contrato)} (${contrato.numero})`,
                    }))}
                  />
                )}
              />
            </Campo>

            <Campo label="Qual foi a multa (descrição da infração)" erro={errors.descricao?.message}>
              <Input {...register("descricao")} placeholder="Ex.: Excesso de velocidade até 20%" />
            </Campo>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Número do auto de infração" erro={errors.numeroAuto?.message}>
                <Input {...register("numeroAuto")} placeholder="0000000000" />
              </Campo>

              <Campo label="Órgão autuador" erro={errors.orgao?.message}>
                <Input {...register("orgao")} placeholder="Ex.: DETRAN-SP" />
              </Campo>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Valor" erro={errors.valor?.message}>
                <Input
                  {...register("valor", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="195,23"
                />
              </Campo>

              <Campo label="Pontos na CNH" erro={errors.pontos?.message}>
                <Input
                  {...register("pontos", { valueAsNumber: true })}
                  type="number"
                  step="1"
                  min={0}
                  max={20}
                  placeholder="5"
                />
              </Campo>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Data em que a multa ocorreu" erro={errors.data?.message}>
                <Input {...register("data")} type="date" />
              </Campo>

              <Campo label="Vencimento" erro={errors.vencimento?.message}>
                <Input {...register("vencimento")} type="date" />
              </Campo>
            </div>

            <Campo
              label="Data de entrada na plataforma"
              erro={errors.dataRegistro?.message}
            >
              <Input {...register("dataRegistro")} type="date" />
            </Campo>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/multas")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Registrando…" : "Registrar multa"}
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
