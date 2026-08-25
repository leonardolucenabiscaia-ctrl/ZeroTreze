"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { useContratoAtivo } from "@/hooks/use-contrato-ativo";
import { criarChamado } from "@/lib/services/chamados.service";
import type { CategoriaChamado, PrioridadeChamado } from "@/lib/types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectBusca } from "@/components/ui/select-busca";

const CATEGORIAS: { value: CategoriaChamado; label: string }[] = [
  { value: "financeiro", label: "Financeiro" },
  { value: "manutencao", label: "Manutenção" },
  { value: "documentacao", label: "Documentação" },
  { value: "acidente", label: "Acidente" },
  { value: "troca_veiculo", label: "Troca de veículo" },
  { value: "duvidas", label: "Dúvidas" },
];

const PRIORIDADES: { value: PrioridadeChamado; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export default function NovoAtendimentoPage() {
  const router = useRouter();
  const { cliente } = useAuth();
  const { contrato } = useContratoAtivo();

  const [categoria, setCategoria] = React.useState<CategoriaChamado>("duvidas");
  const [prioridade, setPrioridade] = React.useState<PrioridadeChamado>("media");
  const [titulo, setTitulo] = React.useState("");
  const [mensagem, setMensagem] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!cliente) return;
    setEnviando(true);
    try {
      const chamado = await criarChamado({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        contratoId: contrato?.id,
        categoria,
        prioridade,
        titulo,
        mensagemInicial: mensagem,
      });
      toast.success("Chamado aberto com sucesso!");
      router.push(`/atendimento/${chamado.id}`);
    } catch {
      toast.error("Não foi possível abrir o chamado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Novo chamado</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <SelectBusca
                value={categoria}
                onValueChange={(v) => setCategoria(v as CategoriaChamado)}
                searchPlaceholder="Buscar categoria…"
                options={CATEGORIAS.map((c) => ({ value: c.value, label: c.label }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Prioridade</Label>
              <SelectBusca
                value={prioridade}
                onValueChange={(v) => setPrioridade(v as PrioridadeChamado)}
                searchPlaceholder="Buscar prioridade…"
                options={PRIORIDADES.map((p) => ({ value: p.value, label: p.label }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mensagem">Descreva sua solicitação</Label>
            <textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              required
              rows={4}
              className="rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? "Enviando…" : "Abrir chamado"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
