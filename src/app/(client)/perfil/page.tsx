"use client";

import * as React from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { atualizarUsuario } from "@/lib/services/usuarios.service";
import { atualizarCliente } from "@/lib/services/clientes.service";
import { formatCPF, formatPhone } from "@/lib/utils/formatters";
import type { CanalNotificacao } from "@/lib/types";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const CANAIS: { value: CanalNotificacao; label: string }[] = [
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "push", label: "Push" },
];

export default function PerfilPage() {
  const { usuario, cliente } = useAuth();

  // O ClientOnlyGuard só monta esta página depois que `usuario` está carregado,
  // então os valores iniciais abaixo já refletem a sessão real (sem precisar de efeito).
  const [nome, setNome] = React.useState(() => usuario?.nome ?? "");
  const [telefone, setTelefone] = React.useState(() => usuario?.telefone ?? "");
  const [email, setEmail] = React.useState(() => usuario?.email ?? "");
  const [preferencias, setPreferencias] = React.useState<Record<CanalNotificacao, boolean>>(
    () => usuario?.preferenciasNotificacao ?? { sms: false, whatsapp: false, email: false, push: false }
  );
  const [salvando, setSalvando] = React.useState(false);

  if (!usuario || !cliente) return <Skeleton className="h-96 w-full" />;

  async function handleSalvarDados(event: React.FormEvent) {
    event.preventDefault();
    setSalvando(true);
    try {
      await atualizarUsuario(usuario!.id, { nome, telefone, email, preferenciasNotificacao: preferencias });
      toast.success("Perfil atualizado com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarBancarios(event: React.FormEvent) {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);
    await atualizarCliente(cliente!.id, {
      dadosBancarios: {
        banco: String(form.get("banco")),
        agencia: String(form.get("agencia")),
        conta: String(form.get("conta")),
        chavePix: String(form.get("chavePix")),
      },
    });
    toast.success("Dados bancários atualizados.");
  }

  function iniciais(n: string) {
    return n.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSalvarDados} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={usuario.fotoUrl} alt={usuario.nome} />
                <AvatarFallback className="text-base">{iniciais(usuario.nome)}</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm" onClick={() => toast.success("Foto atualizada.")}>
                Alterar foto
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="documento">CPF/CNPJ</Label>
                <Input id="documento" value={formatCPF(cliente.documento)} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senha">Nova senha</Label>
                <Input id="senha" type="password" placeholder="••••••" />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">Notificações</p>
              <div className="flex flex-wrap gap-4">
                {CANAIS.map((canal) => (
                  <label key={canal.value} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={preferencias[canal.value]}
                      onChange={(e) =>
                        setPreferencias((atuais) => ({ ...atuais, [canal.value]: e.target.checked }))
                      }
                      className="size-4 rounded border-border accent-[var(--gold)]"
                    />
                    {canal.label}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={salvando} className="w-fit">
              {salvando ? "Salvando…" : "Salvar alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Endereço</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Logradouro</dt>
              <dd className="font-medium text-foreground">
                {cliente.endereco.logradouro}, {cliente.endereco.numero}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Bairro</dt>
              <dd className="font-medium text-foreground">{cliente.endereco.bairro}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Cidade/UF</dt>
              <dd className="font-medium text-foreground">
                {cliente.endereco.cidade}/{cliente.endereco.estado}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">CEP</dt>
              <dd className="font-medium text-foreground">{cliente.endereco.cep}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados bancários e PIX</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSalvarBancarios} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="banco">Banco</Label>
              <Input id="banco" name="banco" defaultValue={cliente.dadosBancarios.banco} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agencia">Agência</Label>
              <Input id="agencia" name="agencia" defaultValue={cliente.dadosBancarios.agencia} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="conta">Conta</Label>
              <Input id="conta" name="conta" defaultValue={cliente.dadosBancarios.conta} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chavePix">Chave PIX</Label>
              <Input id="chavePix" name="chavePix" defaultValue={cliente.dadosBancarios.chavePix} />
            </div>
            <Button type="submit" className="w-fit sm:col-span-2">
              Salvar dados bancários
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
