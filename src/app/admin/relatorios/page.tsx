"use client";

import * as React from "react";
import { Download, FileDown } from "lucide-react";
import { toast } from "sonner";

import { gerarRelatorio, type FormatoRelatorio, type TipoRelatorio } from "@/lib/services/relatorios.service";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RELATORIOS: { tipo: TipoRelatorio; label: string }[] = [
  { tipo: "financeiro", label: "Financeiro" },
  { tipo: "contratos", label: "Contratos" },
  { tipo: "clientes", label: "Clientes" },
  { tipo: "veiculos", label: "Veículos" },
  { tipo: "inadimplencia", label: "Inadimplência" },
  { tipo: "pagamentos", label: "Pagamentos" },
  { tipo: "multas", label: "Multas" },
  { tipo: "chamados", label: "Chamados" },
  { tipo: "score", label: "Score" },
  { tipo: "renovacoes", label: "Renovações" },
];

const FORMATOS: FormatoRelatorio[] = ["pdf", "excel", "csv"];

export default function RelatoriosPage() {
  const [gerando, setGerando] = React.useState<string | null>(null);

  async function handleGerar(tipo: TipoRelatorio, formato: FormatoRelatorio) {
    const chave = `${tipo}-${formato}`;
    setGerando(chave);
    try {
      const { nomeArquivo } = await gerarRelatorio(tipo, formato);
      toast.success(`Relatório gerado: ${nomeArquivo}`);
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Gere relatórios em PDF, Excel ou CSV.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RELATORIOS.map((relatorio) => (
          <Card key={relatorio.tipo}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                <FileDown className="size-4 text-gold" />
                {relatorio.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              {FORMATOS.map((formato) => {
                const chave = `${relatorio.tipo}-${formato}`;
                return (
                  <Button
                    key={formato}
                    size="sm"
                    variant="outline"
                    disabled={gerando === chave}
                    onClick={() => handleGerar(relatorio.tipo, formato)}
                  >
                    <Download className="size-3.5" />
                    {gerando === chave ? "…" : formato.toUpperCase()}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
