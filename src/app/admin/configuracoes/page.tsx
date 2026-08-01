"use client";

import * as React from "react";
import { toast } from "sonner";

import { obterParametrosFinanceiros, atualizarParametrosFinanceiros } from "@/lib/services/financeiro.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import type { ParametrosFinanceiros } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConfiguracoesPage() {
  const { usuario } = useAuth();
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    obterParametrosFinanceiros().then(setParametros);
  }, []);

  if (!parametros) return <Skeleton className="h-72 w-full" />;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSalvando(true);
    try {
      const atualizados = await atualizarParametrosFinanceiros(parametros!);
      setParametros(atualizados);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Atualizou os parâmetros financeiros",
          entidade: "Configurações",
          entidadeId: "Multa, juros e correção",
        });
      }
      toast.success("Parâmetros financeiros atualizados.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Parâmetros de multa, juros e correção</CardTitle>
          <CardDescription>
            Usados para calcular automaticamente o valor atualizado das parcelas em atraso, conforme a
            cláusula de inadimplemento do contrato: atualização monetária com base no IPCA, multa sobre o
            valor da locação e juros de mora fixos por dia de atraso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="multa">Multa por inadimplemento (%)</Label>
              <Input
                id="multa"
                type="number"
                step="0.01"
                value={parametros.percentualMulta}
                onChange={(e) =>
                  setParametros({ ...parametros, percentualMulta: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="juros">Juros de mora (R$ por dia)</Label>
              <Input
                id="juros"
                type="number"
                step="0.5"
                value={parametros.jurosMoraDiarioReais}
                onChange={(e) =>
                  setParametros({ ...parametros, jurosMoraDiarioReais: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="correcao">Correção monetária mensal — IPCA (%)</Label>
              <Input
                id="correcao"
                type="number"
                step="0.01"
                value={parametros.indiceCorrecaoMensal}
                onChange={(e) =>
                  setParametros({ ...parametros, indiceCorrecaoMensal: Number(e.target.value) })
                }
              />
            </div>
            <Button type="submit" disabled={salvando} className="w-fit sm:col-span-3">
              {salvando ? "Salvando…" : "Salvar parâmetros"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
