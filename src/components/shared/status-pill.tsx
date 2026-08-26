import { Badge } from "@/components/ui/badge";
import type {
  StatusAcordo,
  StatusAssistencia,
  StatusChamado,
  StatusContrato,
  StatusMulta,
  StatusParcela,
} from "@/lib/types";

type StatusGenerico =
  | StatusContrato
  | StatusParcela
  | StatusMulta
  | StatusChamado
  | StatusAssistencia
  | StatusAcordo;

const CONFIG: Record<StatusGenerico, { label: string; variant: "success" | "warning" | "destructive" | "neutral" | "gold" }> = {
  em_dia: { label: "Em dia", variant: "success" },
  vence_em_breve: { label: "Vence em breve", variant: "warning" },
  atraso: { label: "Em atraso", variant: "destructive" },
  encerrado: { label: "Encerrado", variant: "neutral" },
  pago: { label: "Pago", variant: "success" },
  em_aberto: { label: "Em aberto", variant: "neutral" },
  vencido: { label: "Vencido", variant: "destructive" },
  aguardando_confirmacao: { label: "Aguardando confirmação", variant: "warning" },
  renegociado: { label: "Renegociado em acordo", variant: "gold" },
  pendente: { label: "Pendente", variant: "warning" },
  paga: { label: "Paga", variant: "success" },
  vencida: { label: "Vencida", variant: "destructive" },
  recorrida: { label: "Recorrida", variant: "gold" },
  aberto: { label: "Aberto", variant: "warning" },
  em_andamento: { label: "Em andamento", variant: "gold" },
  aguardando_cliente: { label: "Aguardando cliente", variant: "neutral" },
  resolvido: { label: "Resolvido", variant: "success" },
  solicitado: { label: "Solicitado", variant: "warning" },
  a_caminho: { label: "A caminho", variant: "gold" },
  em_atendimento: { label: "Em atendimento", variant: "gold" },
  concluido: { label: "Concluído", variant: "success" },
  cancelado: { label: "Cancelado", variant: "neutral" },
  ativo: { label: "Ativo", variant: "gold" },
  quitado: { label: "Quitado", variant: "success" },
  rompido: { label: "Rompido", variant: "destructive" },
};

export function StatusPill({ status, className }: { status: StatusGenerico; className?: string }) {
  const config = CONFIG[status] ?? { label: status, variant: "neutral" as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
