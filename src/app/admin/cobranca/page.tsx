"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  listarRegrasCobranca,
  atualizarRegraCobranca,
  listarNotificacoesCobranca,
} from "@/lib/services/cobranca.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { NotificacaoCobranca, RegraCobranca } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

function labelOffset(dias: number) {
  if (dias < 0) return `${Math.abs(dias)} dias antes do vencimento`;
  if (dias === 0) return "No dia do vencimento";
  return `${dias} ${dias === 1 ? "dia" : "dias"} após o vencimento`;
}

const CANAL_LABEL: Record<string, string> = {
  email: "E-mail",
  sms: "SMS",
  whatsapp: "WhatsApp",
  push: "Push",
};

export default function CobrancaPage() {
  const [regras, setRegras] = React.useState<RegraCobranca[] | null>(null);
  const [notificacoes, setNotificacoes] = React.useState<NotificacaoCobranca[] | null>(null);

  React.useEffect(() => {
    listarRegrasCobranca().then(setRegras);
    listarNotificacoesCobranca().then(setNotificacoes);
  }, []);

  async function alternar(regra: RegraCobranca) {
    const atualizada = await atualizarRegraCobranca(regra.id, { ativa: !regra.ativa });
    setRegras((atuais) => atuais!.map((r) => (r.id === regra.id ? atualizada : r)));
    toast.success(`Regra ${atualizada.ativa ? "ativada" : "desativada"}.`);
  }

  if (!regras || !notificacoes) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cobrança inteligente</h1>
          <p className="text-sm text-muted-foreground">
            Regras automáticas de lembrete por e-mail, SMS, WhatsApp e push.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/cobranca/novo">
            <Plus className="size-4" />
            Nova notificação
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {regras.map((regra) => (
          <Card key={regra.id} className="flex-row items-center justify-between gap-4">
            <CardContent className="flex flex-1 flex-col gap-1.5 p-0">
              <CardHeader className="p-0">
                <CardTitle className="text-sm font-medium text-foreground">{labelOffset(regra.offsetDias)}</CardTitle>
              </CardHeader>
              <p className="text-sm text-muted-foreground">{regra.mensagem}</p>
              <div className="flex gap-1.5">
                {regra.canais.map((canal) => (
                  <Badge key={canal} variant="outline">
                    {CANAL_LABEL[canal]}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <Switch checked={regra.ativa} onCheckedChange={() => alternar(regra)} />
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Notificações avulsas enviadas</h2>

        {notificacoes.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhuma notificação avulsa enviada"
            description="Use o botão “Nova notificação” para avisar um cliente específico ou todos os clientes em atraso."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {notificacoes.map((notificacao) => (
              <Card key={notificacao.id} className="gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{notificacao.titulo}</p>
                    <p className="text-sm text-muted-foreground">{notificacao.descricao}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(notificacao.enviadoEm)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {notificacao.canais.map((canal) => (
                    <Badge key={canal} variant="outline">
                      {CANAL_LABEL[canal]}
                    </Badge>
                  ))}
                  <Badge variant="gold">
                    {notificacao.destinatario === "cliente_especifico"
                      ? notificacao.clienteNome ?? "Cliente específico"
                      : `${notificacao.clientesAlcancados} cliente${notificacao.clientesAlcancados === 1 ? "" : "s"} em atraso`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Enviado por {notificacao.enviadoPorNome}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
