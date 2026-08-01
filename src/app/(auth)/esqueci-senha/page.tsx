"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/services/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function EsqueciSenhaPage() {
  const [identificador, setIdentificador] = React.useState("");
  const [enviado, setEnviado] = React.useState(false);
  const [carregando, setCarregando] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCarregando(true);
    try {
      // Confirma que a conta existe (mesma rota usada no login). O envio de e-mail de
      // redefinição de verdade (supabase.auth.resetPasswordForEmail) fica para quando existir
      // uma página de "definir nova senha" para completar o fluxo — por ora, mesmo
      // comportamento de antes: só valida e mostra a confirmação genérica.
      await apiFetch("/api/auth/resolver-email", {
        method: "POST",
        body: JSON.stringify({ identificador }),
      });
      setEnviado(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card>
      <Link href="/login" className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Voltar para o login
      </Link>

      {enviado ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/15">
            <MailCheck className="size-6 text-success" />
          </div>
          <p className="text-sm font-medium text-foreground">Instruções enviadas</p>
          <p className="text-xs text-muted-foreground">
            Se encontrarmos uma conta com esses dados, enviaremos as instruções de redefinição de
            senha em instantes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recuperar senha</h2>
            <p className="text-xs text-muted-foreground">
              Informe seu CPF, CNPJ ou e-mail cadastrado.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identificador">CPF, CNPJ ou e-mail</Label>
            <Input
              id="identificador"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={carregando}>
            {carregando ? "Enviando…" : "Enviar instruções"}
          </Button>
        </form>
      )}
    </Card>
  );
}
