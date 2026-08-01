"use client";

import { Eye, Wallet } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusPill } from "./status-pill";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import type { ParametrosFinanceiros, Parcela } from "@/lib/types";

export function ParcelasTable({
  parcelas,
  parametros,
  variant = "cliente",
  onPagar,
  onVisualizar,
}: {
  parcelas: Parcela[];
  parametros: ParametrosFinanceiros;
  variant?: "cliente" | "admin";
  onPagar?: (parcela: Parcela) => void;
  onVisualizar?: (parcela: Parcela) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Parcela</TableHead>
          <TableHead>Competência</TableHead>
          <TableHead>Valor original</TableHead>
          <TableHead>Juros</TableHead>
          <TableHead>Multa</TableHead>
          <TableHead>Correção</TableHead>
          <TableHead>Valor atualizado</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parcelas.map((parcela) => {
          const atualizado = calcularValorAtualizado(parcela, parametros);
          return (
            <TableRow key={parcela.id}>
              <TableCell className="font-medium">{parcela.numero}</TableCell>
              <TableCell>{parcela.competencia}</TableCell>
              <TableCell>{formatCurrency(parcela.valorOriginal)}</TableCell>
              <TableCell className="text-muted-foreground">
                {atualizado.juros > 0 ? formatCurrency(atualizado.juros) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {atualizado.multa > 0 ? formatCurrency(atualizado.multa) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {atualizado.correcao > 0 ? formatCurrency(atualizado.correcao) : "—"}
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {formatCurrency(atualizado.valorFinal)}
              </TableCell>
              <TableCell>{formatDate(parcela.dataVencimento)}</TableCell>
              <TableCell>
                <StatusPill status={parcela.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onVisualizar?.(parcela)}
                    aria-label="Visualizar parcela"
                  >
                    <Eye className="size-4" />
                  </Button>
                  {variant === "cliente" &&
                    (parcela.status === "em_aberto" || parcela.status === "vencido") && (
                    <Button size="sm" onClick={() => onPagar?.(parcela)}>
                      <Wallet className="size-4" />
                      Pagar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
