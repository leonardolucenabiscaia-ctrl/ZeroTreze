"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/services/api-client";
import type { Usuario } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Etapa = "codigo" | "senha" | "concluido";

/**
 * Fluxo de duas etapas — email+código, depois senha — em vez de um link clicável de e-mail: o
 * link mágico da Supabase se mostrou vulnerável a scanners de segurança de e-mail (ex.: o Gmail
 * abre automaticamente os links pra checar se são seguros, consumindo o token de uso único antes
 * do usuário clicar de verdade — ver `auth-invite.ts`). Um código digitado manualmente não sofre
 * disso.
 */
export default function DefinirSenhaPage() {
  const router = useRouter();
  const [etapa, setEtapa] = React.useState<Etapa>("codigo");
  const [email, setEmail] = React.useState("");
  const [codigo, setCodigo] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [confirmarSenha, setConfirmarSenha] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  async function handleVerificarCodigo(event: React.FormEvent) {
    event.preventDefault();
    setEnviando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
      if (error) throw new Error("Código inválido ou expirado. Confira o e-mail e tente de novo.");
      setEtapa("senha");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível verificar o código.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleDefinirSenha(event: React.FormEvent) {
    event.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw new Error(error.message);

      const { usuario } = await apiFetch<{ usuario: Usuario }>("/api/auth/perfil");
      toast.success("Senha definida com sucesso!");
      setEtapa("concluido");
      router.push(usuario.perfil === "cliente" ? "/dashboard" : "/admin/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível definir a senha.");
    } finally {
      setEnviando(false);
    }
  }

  if (etapa === "concluido") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-6 text-success" />
          </div>
          <p className="text-sm font-medium text-foreground">Senha definida! Redirecionando…</p>
        </div>
      </Card>
    );
  }

  if (etapa === "senha") {
    return (
      <Card>
        <form onSubmit={handleDefinirSenha} className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Defina sua senha</h2>
            <p className="text-xs text-muted-foreground">
              Escolha uma senha para acessar sua conta daqui pra frente.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmarSenha">Confirmar senha</Label>
            <Input
              id="confirmarSenha"
              type="password"
              placeholder="••••••"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={enviando} className="mt-2">
            {enviando ? "Salvando…" : "Definir senha e entrar"}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleVerificarCodigo} className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Confirme seu acesso</h2>
          <p className="text-xs text-muted-foreground">
            Digite o e-mail cadastrado e o código de 8 dígitos que enviamos para ele.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="codigo">Código de verificação</Label>
          <Input
            id="codigo"
            inputMode="numeric"
            maxLength={8}
            placeholder="00000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="text-center text-lg tracking-[0.35em]"
            required
          />
        </div>
        <Button type="submit" size="lg" disabled={enviando} className="mt-2">
          {enviando ? "Verificando…" : "Confirmar"}
        </Button>
      </form>
    </Card>
  );
}
