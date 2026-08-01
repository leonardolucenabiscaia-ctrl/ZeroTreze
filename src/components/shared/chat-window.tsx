"use client";

import * as React from "react";
import { Paperclip, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import type { Mensagem } from "@/lib/types";

export function ChatWindow({
  mensagens,
  autorId,
  onEnviar,
  disabled,
}: {
  mensagens: Mensagem[];
  autorId: string;
  onEnviar: (texto: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [texto, setTexto] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens.length]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      await onEnviar(texto.trim());
      setTexto("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-xl border border-border bg-card">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {mensagens.map((mensagem) => {
            const propria = mensagem.autorId === autorId;
            return (
              <div key={mensagem.id} className={cn("flex flex-col", propria ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    propria
                      ? "rounded-br-sm bg-gold text-gold-foreground"
                      : "rounded-bl-sm bg-secondary text-foreground"
                  )}
                >
                  {!propria && <p className="mb-0.5 text-[11px] font-medium opacity-70">{mensagem.autorNome}</p>}
                  <p>{mensagem.texto}</p>
                </div>
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {formatDateTime(mensagem.enviadaEm)}
                  {propria && ` · ${mensagem.status === "lida" ? "Lida" : mensagem.status === "entregue" ? "Entregue" : "Enviada"}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <Button type="button" variant="ghost" size="icon" disabled={disabled}>
          <Paperclip className="size-4" />
        </Button>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite uma mensagem…"
          disabled={disabled}
          className="h-10 flex-1 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button type="submit" size="icon" disabled={disabled || enviando || !texto.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
