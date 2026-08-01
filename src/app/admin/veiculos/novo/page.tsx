"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { criarVeiculo } from "@/lib/services/veiculos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPlate } from "@/lib/utils/formatters";

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
import { FileUploader } from "@/components/shared/file-uploader";

const CATEGORIAS = ["Hatch", "Sedan", "SUV", "Picape", "Utilitário"];
const COMBUSTIVEIS = ["Flex", "Gasolina", "Diesel", "Híbrido", "Elétrico"];

const anoAtual = new Date().getFullYear();

// Limite máximo de caracteres por campo — só o necessário para cada formato é permitido.
const LIMITES = {
  marca: 40,
  modelo: 60,
  placa: 7,
  cor: 30,
  renavam: 11,
  chassi: 17,
} as const;

const veiculoSchema = z.object({
  marca: z.string().trim().min(2, "Informe a marca").max(LIMITES.marca),
  modelo: z.string().trim().min(1, "Informe o modelo").max(LIMITES.modelo),
  ano: z.number().int("Ano inválido").min(1980, "Ano inválido").max(anoAtual + 1, "Ano inválido"),
  placa: z
    .string()
    .max(LIMITES.placa)
    .refine((v) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(v), "Placa inválida"),
  cor: z.string().trim().min(2, "Informe a cor").max(LIMITES.cor),
  renavam: z
    .string()
    .max(LIMITES.renavam)
    .refine((v) => /^\d{9,11}$/.test(v), "Renavam inválido"),
  chassi: z
    .string()
    .max(LIMITES.chassi)
    .refine((v) => v.length === 17, "Chassi deve ter 17 caracteres"),
  categoria: z.string().min(1, "Selecione a categoria"),
  combustivel: z.string().min(1, "Selecione o combustível"),
});

type VeiculoFormValues = z.infer<typeof veiculoSchema>;

export default function NovoVeiculoPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [anexos, setAnexos] = React.useState<File[]>([]);
  const [enviando, setEnviando] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoSchema),
  });

  const placaField = register("placa");
  const chassiField = register("chassi");
  const renavamField = register("renavam");

  async function onSubmit(values: VeiculoFormValues) {
    setEnviando(true);
    try {
      const veiculo = await criarVeiculo({ ...values, anexos });
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Cadastrou o veículo",
          entidade: "Veículo",
          entidadeId: `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`,
        });
      }
      toast.success("Veículo cadastrado com sucesso!");
      router.push(`/admin/veiculos/${veiculo.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o veículo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Adicionar veículo</h1>
        <p className="text-sm text-muted-foreground">Cadastre os dados do veículo na frota.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Dados do veículo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo label="Marca" erro={errors.marca?.message}>
              <Input {...register("marca")} maxLength={LIMITES.marca} placeholder="Toyota" />
            </Campo>

            <Campo label="Modelo" erro={errors.modelo?.message}>
              <Input {...register("modelo")} maxLength={LIMITES.modelo} placeholder="Corolla" />
            </Campo>

            <Campo label="Ano" erro={errors.ano?.message}>
              <Input
                {...register("ano", { valueAsNumber: true })}
                type="number"
                min={1980}
                max={anoAtual + 1}
                placeholder={String(anoAtual)}
              />
            </Campo>

            <Campo label="Cor" erro={errors.cor?.message}>
              <Input {...register("cor")} maxLength={LIMITES.cor} placeholder="Prata" />
            </Campo>

            <Campo label="Placa" erro={errors.placa?.message}>
              <Input
                {...placaField}
                maxLength={LIMITES.placa}
                placeholder="ABC1D23"
                onChange={(e) => {
                  e.target.value = formatPlate(e.target.value).slice(0, LIMITES.placa);
                  placaField.onChange(e);
                }}
              />
            </Campo>

            <Campo label="Renavam" erro={errors.renavam?.message}>
              <Input
                {...renavamField}
                maxLength={LIMITES.renavam}
                placeholder="00000000000"
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "").slice(0, LIMITES.renavam);
                  renavamField.onChange(e);
                }}
              />
            </Campo>

            <Campo label="Chassi" erro={errors.chassi?.message} className="sm:col-span-2">
              <Input
                {...chassiField}
                maxLength={LIMITES.chassi}
                placeholder="17 caracteres"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase().slice(0, LIMITES.chassi);
                  chassiField.onChange(e);
                }}
              />
            </Campo>

            <Campo label="Categoria" erro={errors.categoria?.message}>
              <Controller
                control={control}
                name="categoria"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>

            <Campo label="Combustível" erro={errors.combustivel?.message}>
              <Controller
                control={control}
                name="combustivel"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMBUSTIVEIS.map((combustivel) => (
                        <SelectItem key={combustivel} value={combustivel}>
                          {combustivel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Documentos</CardTitle>
            <CardDescription>Anexe CRLV, nota fiscal, laudo cautelar, etc.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader arquivos={anexos} onChange={setAnexos} label="" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/veiculos")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Cadastrando…" : "Cadastrar veículo"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Campo({
  label,
  erro,
  className,
  children,
}: {
  label: string;
  erro?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
