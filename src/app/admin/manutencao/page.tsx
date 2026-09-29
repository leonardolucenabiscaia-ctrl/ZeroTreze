"use client";

import * as React from "react";
import Link from "next/link";
import { Wrench, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { listarVeiculosEmManutencao, retirarVeiculoDeManutencao } from "@/lib/services/veiculos.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime } from "@/lib/utils/formatters";
import type { Veiculo } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

const TIPO_LABEL: Record<"mecanica" | "funilaria", string> = {
  mecanica: "Mecânica",
  funilaria: "Funilaria",
};

export default function ManutencaoPage() {
  const { usuario } = useAuth();
  const [emManutencao, setEmManutencao] = React.useState<Veiculo[] | null>(null);
  const [concluindoId, setConcluindoId] = React.useState<string | null>(null);

  const carregar = React.useCallback(() => {
    listarVeiculosEmManutencao().then(setEmManutencao);
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleConcluir(veiculo: Veiculo) {
    setConcluindoId(veiculo.id);
    try {
      await retirarVeiculoDeManutencao(veiculo.id);
      if (usuario) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Concluiu a manutenção do veículo",
          entidade: "Veículo",
          entidadeId: `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`,
        });
      }
      toast.success("Manutenção concluída — veículo disponível novamente.");
      carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a manutenção.");
    } finally {
      setConcluindoId(null);
    }
  }

  if (!emManutencao) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Manutenção</h1>
        <p className="text-sm text-muted-foreground">
          Veículos em manutenção mecânica ou funilaria — refletido automaticamente no Dashboard de
          TV. Para colocar um veículo em manutenção, acesse a página dele e use o botão &ldquo;Colocar
          em manutenção&rdquo;.
        </p>
      </div>

      {emManutencao.length === 0 ? (
        <EmptyState icon={Wrench} title="Nenhum veículo em manutenção no momento" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {emManutencao.map((veiculo) => (
            <Card key={veiculo.id} className="gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/admin/veiculos/${veiculo.id}`} className="font-medium text-foreground hover:text-gold">
                    {veiculo.marca} {veiculo.modelo}
                  </Link>
                  <p className="text-xs text-muted-foreground">{veiculo.placa}</p>
                </div>
                <Badge variant={veiculo.manutencaoTipo === "funilaria" ? "neutral" : "warning"}>
                  {veiculo.manutencaoTipo ? TIPO_LABEL[veiculo.manutencaoTipo] : ""}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Desde {veiculo.manutencaoDesde ? formatDateTime(veiculo.manutencaoDesde) : "—"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConcluir(veiculo)}
                disabled={concluindoId === veiculo.id}
              >
                <CheckCircle2 className="size-3.5" />
                {concluindoId === veiculo.id ? "Concluindo…" : "Concluir manutenção"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
