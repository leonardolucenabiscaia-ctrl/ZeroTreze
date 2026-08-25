"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { criarCliente } from "@/lib/services/clientes.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { cepProvider } from "@/lib/integrations/cep";
import { calcularIdade, isCnhValida, isMaiorDeIdade, validarCPF } from "@/lib/utils/validators";
import { formatCEP, formatCPF, formatPhone } from "@/lib/utils/formatters";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectBusca } from "@/components/ui/select-busca";
import { FileUploader } from "@/components/shared/file-uploader";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// Limite máximo de caracteres por campo — só o necessário para cada formato é permitido.
const LIMITES = {
  nomeCompleto: 100,
  email: 100,
  cpf: 14, // 000.000.000-00
  rg: 12, // 00.000.000-0
  nacionalidade: 40,
  profissao: 60,
  telefone: 15, // (00) 00000-0000
  cnhNumero: 11,
  cep: 9, // 00000-000
  endereco: 100,
  numero: 10,
  complemento: 50,
  bairro: 60,
  cidade: 60,
} as const;

const clienteSchema = z.object({
  nomeCompleto: z.string().trim().min(3, "Informe o nome completo").max(LIMITES.nomeCompleto),
  email: z.string().trim().email("E-mail inválido").max(LIMITES.email),
  cpf: z.string().max(LIMITES.cpf).refine(validarCPF, "CPF inválido"),
  rg: z.string().trim().min(5, "RG inválido").max(LIMITES.rg),
  nacionalidade: z.string().trim().min(2, "Informe a nacionalidade").max(LIMITES.nacionalidade),
  profissao: z.string().trim().min(2, "Informe a profissão").max(LIMITES.profissao),
  telefone: z.string().trim().min(14, "Telefone inválido").max(LIMITES.telefone),
  dataNascimento: z
    .string()
    .min(1, "Informe a data de nascimento")
    .refine(isMaiorDeIdade, "O cliente deve ser maior de 18 anos"),
  cnhNumero: z.string().trim().min(5, "Número da CNH inválido").max(LIMITES.cnhNumero),
  cnhValidade: z.string().min(1, "Informe a validade da CNH").refine(isCnhValida, "A CNH está vencida"),
  cep: z
    .string()
    .max(LIMITES.cep)
    .refine((v) => v.replace(/\D/g, "").length === 8, "CEP inválido"),
  endereco: z.string().trim().min(3, "Informe o endereço").max(LIMITES.endereco),
  numero: z.string().trim().min(1, "Informe o número").max(LIMITES.numero),
  complemento: z.string().max(LIMITES.complemento).optional(),
  bairro: z.string().trim().min(2, "Informe o bairro").max(LIMITES.bairro),
  cidade: z.string().trim().min(2, "Informe a cidade").max(LIMITES.cidade),
  uf: z.string().length(2, "Selecione o estado"),
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

export default function NovoClientePage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [anexos, setAnexos] = React.useState<File[]>([]);
  const [buscandoCep, setBuscandoCep] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { nacionalidade: "Brasileira" },
  });

  // watch() não é memoizável pelo React Compiler — comportamento esperado do react-hook-form.
  // eslint-disable-next-line react-hooks/incompatible-library
  const dataNascimento = watch("dataNascimento");
  const cnhValidade = watch("cnhValidade");
  const cpf = watch("cpf");

  const cpfField = register("cpf");
  const telefoneField = register("telefone");
  const cepField = register("cep");

  async function handleCepBlur(event: React.FocusEvent<HTMLInputElement>) {
    const digitos = event.target.value.replace(/\D/g, "");
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    try {
      const endereco = await cepProvider.buscarEndereco(digitos);
      if (!endereco) {
        toast.error("CEP não encontrado.");
        return;
      }
      setValue("endereco", endereco.logradouro, { shouldValidate: true });
      setValue("bairro", endereco.bairro, { shouldValidate: true });
      setValue("cidade", endereco.cidade, { shouldValidate: true });
      setValue("uf", endereco.estado, { shouldValidate: true });
      toast.success("Endereço preenchido automaticamente pelo CEP.");
    } catch {
      toast.error("Não foi possível buscar esse CEP agora. Preencha o endereço manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  }

  async function onSubmit(values: ClienteFormValues) {
    setEnviando(true);
    try {
      const cliente = await criarCliente({ ...values, anexos });
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Cadastrou o cliente",
          entidade: "Cliente",
          entidadeId: cliente.nome,
        });
      }
      toast.success("Cliente cadastrado com sucesso!");
      router.push(`/admin/clientes/${cliente.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Adicionar novo cliente</h1>
        <p className="text-sm text-muted-foreground">
          O CPF é validado pelo dígito verificador, a idade e a validade da CNH são conferidas
          automaticamente, e o endereço é preenchido a partir do CEP.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nome completo" erro={errors.nomeCompleto?.message} className="sm:col-span-2">
              <Input
                {...register("nomeCompleto")}
                maxLength={LIMITES.nomeCompleto}
                placeholder="Nome completo do cliente"
              />
            </Campo>

            <Campo label="E-mail" erro={errors.email?.message}>
              <Input
                {...register("email")}
                type="email"
                maxLength={LIMITES.email}
                placeholder="email@exemplo.com"
              />
            </Campo>

            <Campo label="Telefone" erro={errors.telefone?.message}>
              <Input
                {...telefoneField}
                maxLength={LIMITES.telefone}
                placeholder="(00) 00000-0000"
                onChange={(e) => {
                  e.target.value = formatPhone(e.target.value);
                  telefoneField.onChange(e);
                }}
              />
            </Campo>

            <Campo label="CPF" erro={errors.cpf?.message}>
              <Input
                {...cpfField}
                maxLength={LIMITES.cpf}
                placeholder="000.000.000-00"
                onChange={(e) => {
                  e.target.value = formatCPF(e.target.value);
                  cpfField.onChange(e);
                }}
              />
              {cpf && !errors.cpf && validarCPF(cpf) && (
                <FeedbackOk texto="CPF válido" />
              )}
            </Campo>

            <Campo label="RG" erro={errors.rg?.message}>
              <Input {...register("rg")} maxLength={LIMITES.rg} placeholder="00.000.000-0" />
            </Campo>

            <Campo label="Nacionalidade" erro={errors.nacionalidade?.message}>
              <Input {...register("nacionalidade")} maxLength={LIMITES.nacionalidade} />
            </Campo>

            <Campo label="Profissão" erro={errors.profissao?.message}>
              <Input {...register("profissao")} maxLength={LIMITES.profissao} placeholder="Profissão" />
            </Campo>

            <Campo label="Data de nascimento" erro={errors.dataNascimento?.message}>
              <Input {...register("dataNascimento")} type="date" />
              {dataNascimento &&
                (isMaiorDeIdade(dataNascimento) ? (
                  <FeedbackOk texto={`Maior de idade (${calcularIdade(dataNascimento)} anos)`} />
                ) : (
                  !errors.dataNascimento && <FeedbackErro texto="Cliente é menor de 18 anos" />
                ))}
            </Campo>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Carteira de Habilitação (CNH)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo label="Número da CNH" erro={errors.cnhNumero?.message}>
              <Input {...register("cnhNumero")} maxLength={LIMITES.cnhNumero} placeholder="00000000000" />
            </Campo>

            <Campo label="Validade da CNH" erro={errors.cnhValidade?.message}>
              <Input {...register("cnhValidade")} type="date" />
              {cnhValidade &&
                (isCnhValida(cnhValidade) ? (
                  <FeedbackOk texto="CNH dentro da validade" />
                ) : (
                  !errors.cnhValidade && <FeedbackErro texto="CNH vencida" />
                ))}
            </Campo>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Endereço</CardTitle>
            <CardDescription>Informe o CEP para preencher o restante automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Campo label="CEP" erro={errors.cep?.message}>
              <div className="relative">
                <Input
                  {...cepField}
                  maxLength={LIMITES.cep}
                  placeholder="00000-000"
                  onChange={(e) => {
                    e.target.value = formatCEP(e.target.value);
                    cepField.onChange(e);
                  }}
                  onBlur={(e) => {
                    cepField.onBlur(e);
                    handleCepBlur(e);
                  }}
                />
                {buscandoCep && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gold" />
                )}
              </div>
            </Campo>

            <Campo label="Endereço" erro={errors.endereco?.message}>
              <Input {...register("endereco")} maxLength={LIMITES.endereco} placeholder="Rua, avenida…" />
            </Campo>

            <Campo label="Número" erro={errors.numero?.message}>
              <Input {...register("numero")} maxLength={LIMITES.numero} />
            </Campo>

            <Campo label="Complemento (opcional)">
              <Input {...register("complemento")} maxLength={LIMITES.complemento} placeholder="Apto, bloco…" />
            </Campo>

            <Campo label="Bairro" erro={errors.bairro?.message}>
              <Input {...register("bairro")} maxLength={LIMITES.bairro} />
            </Campo>

            <Campo label="Cidade" erro={errors.cidade?.message}>
              <Input {...register("cidade")} maxLength={LIMITES.cidade} />
            </Campo>

            <Campo label="UF" erro={errors.uf?.message}>
              <Controller
                control={control}
                name="uf"
                render={({ field }) => (
                  <SelectBusca
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="UF"
                    searchPlaceholder="Buscar UF…"
                    options={UFS.map((uf) => ({ value: uf, label: uf }))}
                  />
                )}
              />
            </Campo>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Documentos</CardTitle>
            <CardDescription>Anexe cópias de CNH, comprovante de residência, etc.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader arquivos={anexos} onChange={setAnexos} label="" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/clientes")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Cadastrando…" : "Cadastrar cliente"}
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
      {erro && <FeedbackErro texto={erro} />}
    </div>
  );
}

function FeedbackOk({ texto }: { texto: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-success">
      <CheckCircle2 className="size-3.5" />
      {texto}
    </span>
  );
}

function FeedbackErro({ texto }: { texto: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-destructive">
      <XCircle className="size-3.5" />
      {texto}
    </span>
  );
}
