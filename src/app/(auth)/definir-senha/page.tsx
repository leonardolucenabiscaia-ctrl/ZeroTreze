"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/services/api-client";
import type { Usuario } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Etapa = "validando" | "formulario" | "invalido" | "concluido";

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [etapa, setEtapa] = React.useState<Etapa>("validando");
  const [senha, setSenha] = React.useState("");
  const [confirmarSenha, setConfirmarSenha] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    // O link de convite/recuperação da Supabase entrega a sessão pelo fragmento da URL
    // (#access_token=...&refresh_token=...), não por um parâmetro `?code=`. O client do
    // `@supabase/ssr` (baseado em cookies, não em detecção automática de fragmento como o client
    // padrão) não processa isso sozinho — precisa ler o fragmento manualmente e chamar
    // `setSession`, que é o que grava a sessão real (cookies) usada pelo resto do app.
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEtapa("invalido");
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      setEtapa(error ? "invalido" : "formulario");
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
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

  if (etapa === "validando") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <p className="text-sm text-muted-foreground">Validando seu convite…</p>
        </div>
      </Card>
    );
  }

  if (etapa === "invalido") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15">
            <XCircle className="size-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">Link inválido ou expirado</p>
          <p className="text-xs text-muted-foreground">
            Peça para o administrador enviar um novo convite, ou use a opção &ldquo;Esqueci minha
            senha&rdquo; na tela de login.
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
            Voltar para o login
          </Button>
        </div>
      </Card>
    );
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

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
