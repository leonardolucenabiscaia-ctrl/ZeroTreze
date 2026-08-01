"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import type { ProvedorSocial } from "@/lib/integrations/social-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GoogleIcon, AppleIcon } from "@/components/shared/social-icons";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginComProvedor, iniciarLoginPorCodigo } = useAuth();

  const [identificador, setIdentificador] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);

  const [destinoCodigo, setDestinoCodigo] = React.useState("");
  const [enviandoCodigo, setEnviandoCodigo] = React.useState(false);

  const [provedorCarregando, setProvedorCarregando] = React.useState<ProvedorSocial | null>(null);

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

  async function handleLoginProvedor(provedor: ProvedorSocial) {
    setProvedorCarregando(provedor);
    try {
      const usuario = await loginComProvedor(provedor);
      toast.success(`Bem-vindo(a), ${usuario.nome.split(" ")[0]}!`);
      router.push(usuario.perfil === "cliente" ? "/dashboard" : "/admin/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setProvedorCarregando(null);
    }
  }

  async function handleEnviarCodigo(event: React.FormEvent) {
    event.preventDefault();
    setEnviandoCodigo(true);
    try {
      const { email } = await iniciarLoginPorCodigo(destinoCodigo);
      sessionStorage.setItem("zt_login_codigo", JSON.stringify({ email }));
      toast.success("Código enviado por e-mail.");
      router.push("/verificar-codigo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o código.");
    } finally {
      setEnviandoCodigo(false);
    }
  }

  return (
    <Card>
      <Tabs defaultValue="senha">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="senha">Senha</TabsTrigger>
          <TabsTrigger value="codigo">Código</TabsTrigger>
        </TabsList>

        <TabsContent value="senha">
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
        </TabsContent>

        <TabsContent value="codigo">
          <form onSubmit={handleEnviarCodigo} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="destino">CPF, CNPJ ou e-mail</Label>
              <Input
                id="destino"
                placeholder="email@exemplo.com"
                value={destinoCodigo}
                onChange={(e) => setDestinoCodigo(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enviaremos um código de acesso para o e-mail cadastrado.
              </p>
            </div>
            <Button type="submit" size="lg" disabled={enviandoCodigo} className="mt-2">
              {enviandoCodigo ? "Enviando…" : "Enviar código"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou continue com</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={provedorCarregando !== null}
          onClick={() => handleLoginProvedor("google")}
        >
          <GoogleIcon className="size-4" />
          {provedorCarregando === "google" ? "Entrando…" : "Entrar com Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={provedorCarregando !== null}
          onClick={() => handleLoginProvedor("apple")}
        >
          <AppleIcon className="size-4" />
          {provedorCarregando === "apple" ? "Entrando…" : "Entrar com Apple"}
        </Button>
      </div>
    </Card>
  );
}
