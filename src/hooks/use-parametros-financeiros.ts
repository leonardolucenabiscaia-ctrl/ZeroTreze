"use client";

import * as React from "react";

import { obterParametrosFinanceiros } from "@/lib/services/financeiro.service";
import type { ParametrosFinanceiros } from "@/lib/types";

export function useParametrosFinanceiros() {
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);

  React.useEffect(() => {
    obterParametrosFinanceiros().then(setParametros);
  }, []);

  return parametros;
}
