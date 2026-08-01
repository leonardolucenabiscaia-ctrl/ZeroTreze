"use client";

import * as React from "react";
import { Bell, BellRing, Check } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { listarNotificacoesPorUsuario, marcarComoLida, marcarTodasComoLidas } from "@/lib/services/notificacoes.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Notificacao } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";

export default function AdminNotificacoesPage() {
  const { usuario } = useAuth();
  const [notificacoes, setNotificacoes] = React.useState<Notificacao[] | null>(null);

  React.useEffect(() => {
    if (!usuario) return;
    listarNotificacoesPorUsuario(usuario.id).then(setNotificacoes);
  }, [usuario]);

  async function handleMarcarLida(id: string) {
    await marcarComoLida(id);
    setNotificacoes((atuais) => atuais!.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  }

  async function handleMarcarTodas() {
    if (!usuario) return;
    await marcarTodasComoLidas(usuario.id);
    setNotificacoes((atuais) => atuais!.map((n) => ({ ...n, lida: true })));
  }

  if (!notificacoes) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Notificações</h1>
        {notificacoes.some((n) => !n.lida) && (
          <Button size="sm" variant="outline" onClick={handleMarcarTodas}>
            <Check className="size-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {notificacoes.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhuma notificação" />
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {notificacoes.map((n) => (
            <div key={n.id} className={cn("flex items-start justify-between gap-3 px-4 py-3", !n.lida && "bg-gold-muted/40")}>
              <div className="flex items-start gap-3">
                {n.lida ? <Bell className="mt-0.5 size-4 text-muted-foreground" /> : <BellRing className="mt-0.5 size-4 text-gold" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{n.titulo}</p>
                  <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.criadoEm)}</p>
                </div>
              </div>
              {!n.lida && (
                <Button size="sm" variant="ghost" onClick={() => handleMarcarLida(n.id)}>
                  Marcar como lida
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
