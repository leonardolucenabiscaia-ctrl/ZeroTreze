"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Battery,
  Bike,
  Car,
  Fuel,
  Key,
  Siren,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { useContratoAtivo } from "@/hooks/use-contrato-ativo";
import { mapsProvider } from "@/lib/integrations/maps";
import { solicitarAssistencia } from "@/lib/services/assistencia.service";
import type { TipoAssistencia } from "@/lib/types";

const OPCOES: { tipo: TipoAssistencia; label: string; icon: LucideIcon }[] = [
  { tipo: "guincho", label: "Guincho", icon: Car },
  { tipo: "pane_mecanica", label: "Pane mecânica", icon: Wrench },
  { tipo: "pane_eletrica", label: "Pane elétrica", icon: Zap },
  { tipo: "chaveiro", label: "Chaveiro", icon: Key },
  { tipo: "troca_pneu", label: "Troca de pneu", icon: Bike },
  { tipo: "acidente", label: "Acidente", icon: Siren },
  { tipo: "bateria", label: "Bateria", icon: Battery },
  { tipo: "falta_combustivel", label: "Falta de combustível", icon: Fuel },
];

export default function Assistencia24hPage() {
  const router = useRouter();
  const { cliente } = useAuth();
  const { contrato } = useContratoAtivo();
  const [solicitando, setSolicitando] = React.useState<TipoAssistencia | null>(null);

  async function solicitar(tipo: TipoAssistencia) {
    if (!cliente || !contrato) return;
    setSolicitando(tipo);
    try {
      let localizacao: { latitude: number; longitude: number } | undefined;
      try {
        localizacao = await mapsProvider.obterLocalizacaoAtual();
      } catch {
        toast.warning("Não foi possível obter sua localização automaticamente.");
      }

      const solicitacao = await solicitarAssistencia({
        clienteId: cliente.id,
        contratoId: contrato.id,
        tipo,
        latitude: localizacao?.latitude,
        longitude: localizacao?.longitude,
      });

      toast.success(`Assistência solicitada. Protocolo ${solicitacao.protocolo}.`);
      router.push(`/assistencia-24h/${solicitacao.protocolo}`);
    } finally {
      setSolicitando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Assistência 24 horas</h1>
        <p className="text-sm text-muted-foreground">
          Selecione o tipo de ocorrência. Vamos usar sua localização para agilizar o atendimento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {OPCOES.map((opcao) => (
          <button
            key={opcao.tipo}
            onClick={() => solicitar(opcao.tipo)}
            disabled={solicitando !== null}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-8 text-center transition-colors hover:border-gold/40 hover:bg-gold-muted disabled:opacity-50"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-gold-muted text-gold">
              <opcao.icon className="size-7" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {solicitando === opcao.tipo ? "Localizando…" : opcao.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
