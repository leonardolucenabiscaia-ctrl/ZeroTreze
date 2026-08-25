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

type AudioContextConstructor = new () => AudioContext;

function obterAudioContextClasse(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext ??
    null
  );
}

/** Verifica periodicamente se surgiu uma solicitação de assistência nova (status "solicitado")
 * enquanto o backoffice está aberto, e dispara som + toast pra chamar atenção da equipe na hora.
 * Fica no layout do admin (não em cada página) pra sobreviver à navegação entre telas sem
 * reiniciar a lista de solicitações já vistas — senão a mesma solicitação alertaria de novo toda
 * vez que alguém trocasse de página. */
export function AssistenciaAlert() {
  const router = useRouter();
  const idsConhecidos = React.useRef<Set<string> | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  // Cria o AudioContext uma vez só e "destrava" ele no primeiro clique/tecla na página —
  // navegadores bloqueiam áudio iniciado sem gesto prévio do usuário, e como o alerta dispara
  // sozinho (via setInterval, sem clique nenhum), sem isso o som fica mudo sem erro nenhum
  // aparecer (foi exatamente o que aconteceu: o alerta "funcionava" mas não tocava nada).
  React.useEffect(() => {
    const AudioContextClasse = obterAudioContextClasse();
    if (!AudioContextClasse) return;
    const ctx = new AudioContextClasse();
    audioCtxRef.current = ctx;

    function destravar() {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    }
    document.addEventListener("pointerdown", destravar);
    document.addEventListener("keydown", destravar);
    destravar();

    return () => {
      document.removeEventListener("pointerdown", destravar);
      document.removeEventListener("keydown", destravar);
      ctx.close().catch(() => {});
    };
  }, []);

  const tocarAlerta = React.useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      function bip(frequencia: number, inicioSeg: number, duracaoSeg: number) {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        osc.type = "sine";
        osc.frequency.value = frequencia;
        gain.gain.setValueAtTime(0.0001, ctx!.currentTime + inicioSeg);
        gain.gain.exponentialRampToValueAtTime(0.9, ctx!.currentTime + inicioSeg + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx!.currentTime + inicioSeg + duracaoSeg);
        osc.connect(gain);
        gain.connect(ctx!.destination);
        osc.start(ctx!.currentTime + inicioSeg);
        osc.stop(ctx!.currentTime + inicioSeg + duracaoSeg + 0.05);
      }

      // Alterna duas notas por ~6s (bem mais chamativo que um bipe único) e bem mais alto
      // (ganho perto do máximo, antes estava em 0.3).
      const notas = [880, 660, 880, 660, 880, 660, 880, 660, 880, 660];
      let t = 0;
      notas.forEach((freq) => {
        bip(freq, t, 0.38);
        t += 0.6;
      });
    } catch {
      // ambiente sem suporte a Web Audio — segue só com o toast visual
    }
  }, []);

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
  }, [router, tocarAlerta]);

  return null;
}
