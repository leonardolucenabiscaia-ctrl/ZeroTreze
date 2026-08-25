"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { listarSolicitacoes } from "@/lib/services/assistencia.service";

const INTERVALO_MS = 15000;

const LABEL_TIPO: Record<string, string> = {
  guincho: "Guincho",
  pane_mecanica: "Pane mecânica",
  pane_eletrica: "Pane elétrica",
  chaveiro: "Chaveiro",
  troca_pneu: "Troca de pneu",
  acidente: "Acidente",
  bateria: "Bateria",
  falta_combustivel: "Falta de combustível",
};

/** Bipe de dois tons via Web Audio API — sem depender de um arquivo de áudio hospedado.
 * Navegadores podem bloquear áudio sem interação prévia do usuário; nesse caso o alerta some
 * silenciosamente e só o toast visual aparece. */
function tocarAlerta() {
  try {
    type AudioContextConstructor = new () => AudioContext;
    const AudioContextClasse: AudioContextConstructor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioContextConstructor }).webkitAudioContext;
    const ctx = new AudioContextClasse();

    function bip(frequencia: number, inicioSeg: number, duracaoSeg: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequencia;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicioSeg);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + inicioSeg + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicioSeg + duracaoSeg);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + inicioSeg);
      osc.stop(ctx.currentTime + inicioSeg + duracaoSeg + 0.05);
    }

    bip(880, 0, 0.18);
    bip(880, 0.25, 0.18);
    bip(880, 0.5, 0.28);
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // ambiente sem suporte a Web Audio, ou áudio bloqueado pelo navegador — segue só com o toast
  }
}

/** Verifica periodicamente se surgiu uma solicitação de assistência nova (status "solicitado")
 * enquanto o backoffice está aberto, e dispara som + toast pra chamar atenção da equipe na hora.
 * Fica no layout do admin (não em cada página) pra sobreviver à navegação entre telas sem
 * reiniciar a lista de solicitações já vistas — senão a mesma solicitação alertaria de novo toda
 * vez que alguém trocasse de página. */
export function AssistenciaAlert() {
  const router = useRouter();
  const idsConhecidos = React.useRef<Set<string> | null>(null);

  React.useEffect(() => {
    let cancelado = false;

    async function verificar() {
      try {
        const solicitacoes = await listarSolicitacoes();
        if (cancelado) return;
        const pendentes = solicitacoes.filter((s) => s.status === "solicitado");

        if (idsConhecidos.current === null) {
          // primeira checagem depois de abrir o painel: só registra o que já existe, sem alarme
          // (evita disparar toda vez que a equipe entra com uma solicitação antiga ainda parada).
          idsConhecidos.current = new Set(pendentes.map((s) => s.id));
          return;
        }

        const novas = pendentes.filter((s) => !idsConhecidos.current!.has(s.id));
        pendentes.forEach((s) => idsConhecidos.current!.add(s.id));

        if (novas.length > 0) {
          tocarAlerta();
          novas.forEach((s) => {
            toast.warning(`Nova solicitação de assistência 24h — ${LABEL_TIPO[s.tipo] ?? s.tipo}`, {
              description: `Protocolo ${s.protocolo}`,
              duration: 20000,
              action: { label: "Ver", onClick: () => router.push("/admin/assistencia") },
            });
          });
        }
      } catch {
        // melhor esforço — uma falha de rede aqui não deve incomodar o resto do painel
      }
    }

    verificar();
    const intervalo = setInterval(verificar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [router]);

  return null;
}
