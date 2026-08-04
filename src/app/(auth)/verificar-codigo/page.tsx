"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface DadosCodigo {
  email: string;
}

export default function VerificarCodigoPage() {
  const router = useRouter();
  const { confirmarLoginPorCodigo } = useAuth();

  const [dados, setDados] = React.useState<DadosCodigo | null>(null);
  const [codigoDigitado, setCodigoDigitado] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);

  React.useEffect(() => {
    const bruto = sessionStorage.getItem("zt_login_codigo");
    if (!bruto) {
      router.replace("/login");
      return;
    }
    // sessionStorage só existe no cliente, daí a leitura em efeito pós-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDados(JSON.parse(bruto));
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!dados) return;
    setCarregando(true);
    try {
      const usuario = await confirmarLoginPorCodigo(dados.email, codigoDigitado);
      sessionStorage.removeItem("zt_login_codigo");
      toast.success(`Bem-vindo(a), ${usuario.nome.split(" ")[0]}!`);
      router.push(usuario.perfil === "cliente" ? "/dashboard" : "/admin/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Código inválido.");
    } finally {
      setCarregando(false);
    }
  }

  if (!dados) return null;

  return (
    <Card>
      <Link
        href="/login"
        className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Voltar
      </Link>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Digite o código</h2>
          <p className="text-xs text-muted-foreground">
            Enviamos um código de 8 dígitos por e-mail para <span className="text-gold">{dados.email}</span>.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="codigo">Código de verificação</Label>
          <Input
            id="codigo"
            inputMode="numeric"
            maxLength={8}
            placeholder="00000000"
            value={codigoDigitado}
            onChange={(e) => setCodigoDigitado(e.target.value)}
            className="text-center text-lg tracking-[0.35em]"
            required
          />
        </div>
        <Button type="submit" size="lg" disabled={carregando}>
          {carregando ? "Verificando…" : "Confirmar"}
        </Button>
      </form>
    </Card>
  );
}
