"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Star } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { buscarChamadoPorId, enviarMensagem } from "@/lib/services/chamados.service";
import type { Chamado } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/shared/status-pill";
import { ChatWindow } from "@/components/shared/chat-window";

export default function AtendimentoDetalhePage() {
  const params = useParams<{ chamadoId: string }>();
  const router = useRouter();
  const { usuario } = useAuth();
  const [chamado, setChamado] = React.useState<Chamado | null>(null);

  React.useEffect(() => {
    buscarChamadoPorId(params.chamadoId).then((c) => setChamado(c ?? null));
  }, [params.chamadoId]);

  async function handleEnviar(texto: string) {
    if (!usuario || !chamado) return;
    const mensagem = await enviarMensagem(
      chamado.id,
      { autorId: usuario.id, autorNome: usuario.nome, autorPerfil: "cliente" },
      texto
    );
    setChamado((atual) => (atual ? { ...atual, mensagens: [...atual.mensagens, mensagem] } : atual));
  }

  if (!chamado || !usuario) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card className="flex-row items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{chamado.numero}</p>
          <h1 className="text-lg font-semibold text-foreground">{chamado.titulo}</h1>
        </div>
        <StatusPill status={chamado.status} />
      </Card>

      <ChatWindow mensagens={chamado.mensagens} autorId={usuario.id} onEnviar={handleEnviar} />

      {chamado.status === "resolvido" && (
        <Button variant="secondary" onClick={() => router.push(`/avaliacao/${chamado.id}`)}>
          <Star className="size-4" />
          Avaliar atendimento
        </Button>
      )}
    </div>
  );
}
