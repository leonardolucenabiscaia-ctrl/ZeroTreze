"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/services/api-client";
import type { Usuario } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type Etapa = "codigo" | "senha" | "concluido";

/**
 * E-mail (identifica a conta) + código (recebido por WhatsApp), depois senha. A verificação de
 * verdade do código só acontece junto com a definição da senha, numa chamada só
 * (`POST /api/auth/definir-senha`) — a etapa "código" aqui é só uma transição de tela, pra manter
 * a experiência de duas telas sem precisar guardar um estado "verificado" no meio do caminho.
 */
function DefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [etapa, setEtapa] = React.useState<Etapa>("codigo");
  const [email, setEmail] = React.useState(() => searchParams.get("email") ?? "");
  const [codigo, setCodigo] = React.useState(() => searchParams.get("codigo") ?? "");
  const [senha, setSenha] = React.useState("");
  const [confirmarSenha, setConfirmarSenha] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  function handleContinuarComCodigo(event: React.FormEvent) {
    event.preventDefault();
    setEtapa("senha");
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
      await apiFetch("/api/auth/definir-senha", {
        method: "POST",
        body: JSON.stringify({ email, codigo, novaSenha: senha }),
      });

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
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
            <button
              type="button"
              onClick={() => setEtapa("codigo")}
              className="mb-1 text-xs text-muted-foreground hover:text-foreground"
            >
              ← Voltar e conferir o código
            </button>
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
      <form onSubmit={handleContinuarComCodigo} className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Confirme seu acesso</h2>
          <p className="text-xs text-muted-foreground">
            Digite o e-mail cadastrado e o código de 6 dígitos que enviamos por WhatsApp.
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
            maxLength={6}
            placeholder="000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="text-center text-lg tracking-[0.35em]"
            required
          />
        </div>
        <Button type="submit" size="lg">
          Continuar
        </Button>
      </form>
    </Card>
  );
}

export default function DefinirSenhaPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <DefinirSenhaForm />
    </Suspense>
  );
}
