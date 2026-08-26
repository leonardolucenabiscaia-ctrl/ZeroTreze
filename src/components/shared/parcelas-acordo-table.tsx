import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "./status-pill";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { ParcelaAcordo } from "@/lib/types";

/** Mesmo padrão do `ParcelasTable` das parcelas de contrato, sem colunas de juros/multa/correção
 * (a parcela do acordo já é um valor fixo negociado) e sem "Competência". */
export function ParcelasAcordoTable({
  parcelas,
  onPagar,
  onVisualizar,
}: {
  parcelas: ParcelaAcordo[];
  onPagar?: (parcela: ParcelaAcordo) => void;
  onVisualizar?: (parcela: ParcelaAcordo) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Parcela</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parcelas.map((parcela) => {
          const podePagar = parcela.status === "em_aberto" || parcela.status === "vencido";
          return (
            <TableRow key={parcela.id}>
              <TableCell>{parcela.numero}</TableCell>
              <TableCell>{formatCurrency(parcela.valor)}</TableCell>
              <TableCell>{formatDate(parcela.vencimento)}</TableCell>
              <TableCell>
                <StatusPill status={parcela.status} />
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                {podePagar && onPagar && (
                  <Button size="sm" onClick={() => onPagar(parcela)}>
                    Pagar
                  </Button>
                )}
                {onVisualizar && (
                  <Button size="sm" variant="outline" onClick={() => onVisualizar(parcela)}>
                    <Eye className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
