"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identificador, setIdentificador] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);

  async function handleLoginSenha(event: React.FormEvent) {
    event.preventDefault();
    setCarregando(true);
    try {
      const usuario = await login(identificador, senha);
      toast.success(`Bem-vindo(a), ${usuario.nome.split(" ")[0]}!`);
      router.push(usuario.perfil === "cliente" ? "/dashboard" : "/admin/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleLoginSenha} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identificador">CPF, CNPJ ou e-mail</Label>
          <Input
            id="identificador"
            placeholder="000.000.000-00 ou email@exemplo.com"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="senha">Senha</Label>
            <Link href="/esqueci-senha" className="text-xs text-gold hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="senha"
            type="password"
            placeholder="••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="lg" disabled={carregando} className="mt-2">
          {carregando ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Primeira vez por aqui?{" "}
        <Link href="/definir-senha" className="text-gold hover:underline">
          1º Acesso
        </Link>
      </p>
    </Card>
  );
}
