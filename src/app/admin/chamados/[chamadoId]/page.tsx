"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { buscarChamadoPorId, enviarMensagem, atualizarStatusChamado } from "@/lib/services/chamados.service";
import type { Chamado, StatusChamado } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/shared/status-pill";
import { ChatWindow } from "@/components/shared/chat-window";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPCOES: { value: StatusChamado; label: string }[] = [
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "resolvido", label: "Resolvido" },
  { value: "encerrado", label: "Encerrado" },
];

export default function AdminChamadoDetalhePage() {
  const params = useParams<{ chamadoId: string }>();
  const { usuario } = useAuth();
  const [chamado, setChamado] = React.useState<Chamado | null>(null);

  React.useEffect(() => {
    buscarChamadoPorId(params.chamadoId).then((c) => setChamado(c ?? null));
  }, [params.chamadoId]);

  async function handleEnviar(texto: string) {
    if (!usuario || !chamado) return;
    const mensagem = await enviarMensagem(
      chamado.id,
      { autorId: usuario.id, autorNome: usuario.nome, autorPerfil: usuario.perfil },
      texto
    );
    setChamado((atual) => (atual ? { ...atual, mensagens: [...atual.mensagens, mensagem] } : atual));
  }

  async function handleStatus(status: StatusChamado) {
    if (!chamado) return;
    const atualizado = await atualizarStatusChamado(chamado.id, status);
    setChamado(atualizado);
    toast.success("Status atualizado.");
  }

  if (!chamado || !usuario) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card className="flex-row items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{chamado.numero}</p>
          <h1 className="text-lg font-semibold text-foreground">{chamado.titulo}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={chamado.status} />
          <Select value={chamado.status} onValueChange={(v) => handleStatus(v as StatusChamado)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPCOES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <ChatWindow mensagens={chamado.mensagens} autorId={usuario.id} onEnviar={handleEnviar} />
    </div>
  );
}
