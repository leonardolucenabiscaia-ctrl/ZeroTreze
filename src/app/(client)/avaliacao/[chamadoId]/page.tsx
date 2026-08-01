"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { criarAvaliacao } from "@/lib/services/avaliacoes.service";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/shared/star-rating";

const CRITERIOS = [
  { chave: "notaAtendimento", label: "Atendimento" },
  { chave: "notaTempo", label: "Tempo de resposta" },
  { chave: "notaQualidade", label: "Qualidade" },
  { chave: "notaEducacao", label: "Educação" },
  { chave: "notaResolucao", label: "Resolução do problema" },
] as const;

export default function AvaliacaoPage() {
  const params = useParams<{ chamadoId: string }>();
  const router = useRouter();
  const { cliente } = useAuth();

  const [notas, setNotas] = React.useState<Record<string, number>>({
    notaAtendimento: 0,
    notaTempo: 0,
    notaQualidade: 0,
    notaEducacao: 0,
    notaResolucao: 0,
  });
  const [comentario, setComentario] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!cliente) return;
    setEnviando(true);
    try {
      await criarAvaliacao({
        chamadoId: params.chamadoId,
        clienteId: cliente.id,
        notaAtendimento: notas.notaAtendimento,
        notaTempo: notas.notaTempo,
        notaQualidade: notas.notaQualidade,
        notaEducacao: notas.notaEducacao,
        notaResolucao: notas.notaResolucao,
        comentario,
      });
      toast.success("Obrigado pela sua avaliação!");
      router.push("/atendimento");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Avaliar atendimento</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {CRITERIOS.map((c) => (
            <StarRating
              key={c.chave}
              label={c.label}
              value={notas[c.chave]}
              onChange={(v) => setNotas((atuais) => ({ ...atuais, [c.chave]: v }))}
            />
          ))}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="comentario">Comentário (opcional)</Label>
            <textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar avaliação"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
