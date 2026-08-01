"use client";

import * as React from "react";
import { File as FileIcon, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({
  arquivos,
  onChange,
  label = "Documentos",
  hint = "PDF, JPG ou PNG — arraste ou clique para selecionar",
}: {
  arquivos: File[];
  onChange: (arquivos: File[]) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = React.useState(false);

  function adicionarArquivos(lista: FileList | null) {
    if (!lista) return;
    onChange([...arquivos, ...Array.from(lista)]);
  }

  function removerArquivo(indice: number) {
    onChange(arquivos.filter((_, i) => i !== indice));
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          adicionarArquivos(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          arrastando ? "border-gold bg-gold-muted" : "border-border hover:border-gold/40"
        )}
      >
        <Upload className="size-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{hint}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            adicionarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {arquivos.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {arquivos.map((arquivo, indice) => (
            <li
              key={`${arquivo.name}-${indice}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileIcon className="size-4 shrink-0 text-gold" />
                <span className="truncate text-foreground">{arquivo.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatarTamanho(arquivo.size)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removerArquivo(indice)}
                aria-label="Remover arquivo"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
