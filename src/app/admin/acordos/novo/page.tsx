"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { criarAcordo } from "@/lib/services/acordos.service";
import { listarContratos } from "@/lib/services/contratos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCurrency, formatDocument } from "@/lib/utils/formatters";
import type { Cliente, Contrato } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/shared/file-uploader";
import { SelectBusca } from "@/components/ui/select-busca";

const hoje = new Date().toISOString().slice(0, 10);

const acordoSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente"),
  contratoId: z.string().min(1, "Selecione o contrato"),
  valorEntrada: z.number().min(0, "Informe um valor de entrada válido"),
  valorParcela: z.number().positive("Informe um valor de parcela válido"),
  quantidadeParcelas: z.number().int().min(1, "Informe ao menos 1 parcela").max(24, "Máximo de 24 parcelas"),
  dataPrimeiraParcela: z.string().min(1, "Informe a data da primeira parcela"),
  valorDividaOriginal: z.number().min(0, "Informe um valor válido").optional(),
  periodicidade: z.enum(["semanal", "mensal"], { message: "Selecione a periodicidade" }),
  descricao: z.string().max(1000, "A descrição pode ter no máximo 1000 caracteres").optional(),
});

type AcordoFormValues = z.infer<typeof acordoSchema>;

export default function NovoAcordoPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [enviando, setEnviando] = React.useState(false);
  const [anexos, setAnexos] = React.useState<File[]>([]);

  React.useEffect(() => {
    Promise.all([listarClientes(), listarContratos()]).then(([clientesCarregados, contratosCarregados]) => {
      setClientes(clientesCarregados);
      setContratos(contratosCarregados);
      setCarregando(false);
    });
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AcordoFormValues>({
    resolver: zodResolver(acordoSchema),
    defaultValues: { dataPrimeiraParcela: hoje, quantidadeParcelas: 3, periodicidade: "mensal" },
  });

  const clienteId = watch("clienteId");
  const valorEntrada = watch("valorEntrada");
  const valorParcela = watch("valorParcela");
  const quantidadeParcelas = watch("quantidadeParcelas");
  const valorDividaOriginal = watch("valorDividaOriginal");

  const contratosDoCliente = contratos.filter((c) => c.clienteId === clienteId);

  const valorTotal =
    (Number(valorEntrada) || 0) + (Number(valorParcela) || 0) * (Number(quantidadeParcelas) || 0);

  async function onSubmit(values: AcordoFormValues) {
    setEnviando(true);
    try {
      const acordo = await criarAcordo({ ...values, anexos });
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Criou um acordo",
          entidade: "Acordo",
          entidadeId: acordo.numero,
        });
      }
      toast.success(`Acordo ${acordo.numero} criado com sucesso!`);
      router.push("/admin/acordos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o acordo.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Novo acordo</h1>
        <p className="text-sm text-muted-foreground">
          O cliente é notificado automaticamente assim que o acordo é criado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados do acordo</CardTitle>
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

            <Campo label="Contrato" erro={errors.contratoId?.message}>
              <Controller
                control={control}
                name="contratoId"
                render={({ field }) => (
                  <SelectBusca
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!clienteId}
                    placeholder={clienteId ? "Selecione o contrato" : "Selecione o cliente primeiro"}
                    searchPlaceholder="Buscar contrato…"
                    options={contratosDoCliente.map((contrato) => ({
                      value: contrato.id,
                      label: contrato.numero,
                    }))}
                  />
                )}
              />
            </Campo>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Valor de entrada" erro={errors.valorEntrada?.message}>
                <Input
                  {...register("valorEntrada", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="500,00"
                />
              </Campo>

              <Campo label="Valor de cada parcela" erro={errors.valorParcela?.message}>
                <Input
                  {...register("valorParcela", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="300,00"
                />
              </Campo>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Campo label="Quantidade de parcelas" erro={errors.quantidadeParcelas?.message}>
                <Input
                  {...register("quantidadeParcelas", { valueAsNumber: true })}
                  type="number"
                  step="1"
                  min={1}
                  max={24}
                />
              </Campo>

              <Campo label="Vencimento da 1ª parcela" erro={errors.dataPrimeiraParcela?.message}>
                <Input {...register("dataPrimeiraParcela")} type="date" />
              </Campo>
            </div>

            <Campo label="Periodicidade das parcelas" erro={errors.periodicidade?.message}>
              <Controller
                control={control}
                name="periodicidade"
                render={({ field }) => (
                  <SelectBusca
                    value={field.value}
                    onValueChange={field.onChange}
                    searchPlaceholder="Buscar…"
                    options={[
                      { value: "semanal", label: "Semanal" },
                      { value: "mensal", label: "Mensal" },
                    ]}
                  />
                )}
              />
            </Campo>

            <Campo label="Valor cheio da dívida original (opcional)" erro={errors.valorDividaOriginal?.message}>
              <Input
                {...register("valorDividaOriginal", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min={0}
                placeholder="Valor total antes da renegociação, ex.: 4500,00"
              />
            </Campo>

            <Tabs defaultValue="descricao">
              <TabsList>
                <TabsTrigger value="descricao">Descrição</TabsTrigger>
                <TabsTrigger value="anexos">
                  Anexos{anexos.length > 0 ? ` (${anexos.length})` : ""}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="descricao">
                <Campo label="Descrição do acordo (opcional)" erro={errors.descricao?.message}>
                  <Textarea
                    {...register("descricao")}
                    placeholder="Detalhe as condições combinadas com o cliente, motivo da renegociação, observações etc."
                    rows={5}
                  />
                </Campo>
              </TabsContent>

              <TabsContent value="anexos">
                <FileUploader
                  arquivos={anexos}
                  onChange={setAnexos}
                  label=""
                  hint="PDF, JPG ou PNG — comprovantes, termo assinado etc."
                />
              </TabsContent>
            </Tabs>

            <div className="flex flex-col gap-1 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
              {!!valorDividaOriginal && (
                <div>
                  <span className="text-muted-foreground">Valor cheio da dívida original: </span>
                  <span className="font-medium text-foreground">{formatCurrency(valorDividaOriginal)}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Valor total do acordo: </span>
                <span className="font-medium text-gold">{formatCurrency(valorTotal)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/acordos")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Criando…" : "Criar acordo"}
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
