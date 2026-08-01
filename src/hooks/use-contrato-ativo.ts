"use client";

import * as React from "react";

import { useAuth } from "@/lib/auth/auth-context";
import { contratoAtivoPorCliente } from "@/lib/services/contratos.service";
import { buscarVeiculoPorId } from "@/lib/services/veiculos.service";
import type { Contrato, Veiculo } from "@/lib/types";

export function useContratoAtivo() {
  const { cliente } = useAuth();
  const [contrato, setContrato] = React.useState<Contrato | null>(null);
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!cliente) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    let ativo = true;
    setLoading(true);
    contratoAtivoPorCliente(cliente.id).then(async (contratoEncontrado) => {
      if (!ativo) return;
      setContrato(contratoEncontrado ?? null);
      if (contratoEncontrado) {
        const veiculoEncontrado = await buscarVeiculoPorId(contratoEncontrado.veiculoId);
        if (ativo) setVeiculo(veiculoEncontrado ?? null);
      }
      setLoading(false);
    });
    return () => {
      ativo = false;
    };
  }, [cliente]);

  return { cliente, contrato, veiculo, loading };
}
