"use client";

import * as React from "react";
import { Download, FileText, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { listarDocumentosPorCliente } from "@/lib/services/documentos.service";
import type { CategoriaDocumento, Documento } from "@/lib/types";
import { formatDate } from "@/lib/utils/formatters";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";

const CATEGORIAS: { value: CategoriaDocumento | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "contrato", label: "Contrato" },
  { value: "crlv", label: "CRLV" },
  { value: "licenciamento", label: "Licenciamento" },
  { value: "apolice", label: "Apólice" },
  { value: "comprovante", label: "Comprovante" },
  { value: "boleto", label: "Boleto" },
  { value: "nota_fiscal", label: "Nota fiscal" },
  { value: "recibo", label: "Recibo" },
  { value: "acordo", label: "Acordo" },
];

export default function DocumentosPage() {
  const { cliente } = useAuth();
  const [documentos, setDocumentos] = React.useState<Documento[] | null>(null);
  const [categoria, setCategoria] = React.useState<CategoriaDocumento | "todos">("todos");

  React.useEffect(() => {
    if (!cliente) return;
    listarDocumentosPorCliente(cliente.id).then(setDocumentos);
  }, [cliente]);

  if (!documentos) return <Skeleton className="h-96 w-full" />;

  const filtrados =
    categoria === "todos" ? documentos : documentos.filter((d) => d.categoria === categoria);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Documentos</h1>

      <div className="flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoria(c.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              categoria === c.value
                ? "border-gold bg-gold-muted text-gold"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nenhum documento encontrado" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gold-muted text-gold">
                  <FileText className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(doc.criadoEm)} · {(doc.tamanhoKb / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => toast.success("Download iniciado.")}
                aria-label="Baixar documento"
              >
                <Download className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
