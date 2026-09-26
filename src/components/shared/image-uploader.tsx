"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function ImageUploader({
  arquivo,
  onChange,
  label,
  hint = "JPG, PNG ou WEBP — arraste ou clique para selecionar",
  previewAtual,
}: {
  arquivo: File | null;
  onChange: (arquivo: File | null) => void;
  label?: string;
  hint?: string;
  /** URL de uma imagem já existente (ex.: foto atual do veículo) — mostrada como pré-visualização
   * enquanto nenhum arquivo novo foi escolhido, pra deixar claro o que será substituído. */
  previewAtual?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = React.useState(false);
  const preview = React.useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);
  const previewExibido = preview ?? previewAtual ?? null;

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function selecionar(lista: FileList | null) {
    const selecionado = lista?.[0];
    if (selecionado && selecionado.type.startsWith("image/")) onChange(selecionado);
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
          selecionar(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed text-center transition-colors",
          arrastando ? "border-gold bg-gold-muted" : "border-border hover:border-gold/40"
        )}
      >
        {previewExibido ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewExibido} alt="Pré-visualização da foto do veículo" className="h-full w-full object-cover" />
        ) : (
          <>
            <ImagePlus className="size-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{hint}</span>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            selecionar(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {arquivo && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="size-3.5" />
          Remover foto
        </button>
      )}
    </div>
  );
}
