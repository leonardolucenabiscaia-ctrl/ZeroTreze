"use client";

import * as React from "react";
import { FileText, FolderOpen } from "lucide-react";

import { listarDocumentos } from "@/lib/services/documentos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { listarVeiculos } from "@/lib/services/veiculos.service";
import { listarContratos } from "@/lib/services/contratos.service";
import { formatDate } from "@/lib/utils/formatters";
import type { Cliente, Contrato, Documento, Veiculo } from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";

const TODOS = "todos";

const CATEGORIA_LABEL: Record<string, string> = {
  contrato: "Contrato",
  crlv: "CRLV",
  licenciamento: "Licenciamento",
  apolice: "Apólice",
  comprovante: "Comprovante",
  boleto: "Boleto",
  nota_fiscal: "Nota fiscal",
  recibo: "Recibo",
  cadastro: "Cadastro",
  acordo: "Acordo",
};

export default function AdminDocumentosPage() {
  const [documentos, setDocumentos] = React.useState<Documento[] | null>(null);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = React.useState<Veiculo[]>([]);
  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [filtroClienteId, setFiltroClienteId] = React.useState(TODOS);
  const [filtroVeiculoId, setFiltroVeiculoId] = React.useState(TODOS);

  React.useEffect(() => {
    listarDocumentos().then(setDocumentos);
    listarClientes().then(setClientes);
    listarVeiculos().then(setVeiculos);
    listarContratos().then(setContratos);
  }, []);

  if (!documentos) return <Skeleton className="h-96 w-full" />;

  function contratoDoDocumento(doc: Documento) {
    return doc.contratoId ? contratos.find((c) => c.id === doc.contratoId) : undefined;
  }

  // Um documento pode estar vinculado direto ao cliente/veículo, ou apenas ao contrato
  // (que por sua vez liga a um cliente e a um veículo) — resolvemos os dois casos.
  function clienteIdDoDocumento(doc: Documento) {
    return doc.clienteId ?? contratoDoDocumento(doc)?.clienteId;
  }

  function veiculoIdDoDocumento(doc: Documento) {
    return doc.veiculoId ?? contratoDoDocumento(doc)?.veiculoId;
  }

  function nomeCliente(doc: Documento) {
    const id = clienteIdDoDocumento(doc);
    return clientes.find((c) => c.id === id)?.nome ?? "—";
  }

  function nomeVeiculo(doc: Documento) {
    const id = veiculoIdDoDocumento(doc);
    const veiculo = veiculos.find((v) => v.id === id);
    return veiculo ? `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}` : "—";
  }

  const documentosFiltrados = documentos.filter((doc) => {
    if (filtroClienteId !== TODOS && clienteIdDoDocumento(doc) !== filtroClienteId) return false;
    if (filtroVeiculoId !== TODOS && veiculoIdDoDocumento(doc) !== filtroVeiculoId) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Documentos</h1>

      <div className="flex flex-wrap gap-2">
        <Select value={filtroClienteId} onValueChange={setFiltroClienteId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por pessoa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as pessoas</SelectItem>
            {clientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroVeiculoId} onValueChange={setFiltroVeiculoId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por veículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os veículos</SelectItem>
            {veiculos.map((veiculo) => (
              <SelectItem key={veiculo.id} value={veiculo.id}>
                {veiculo.marca} {veiculo.modelo} — {veiculo.placa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {documentosFiltrados.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nenhum documento encontrado" description="Ajuste os filtros para ver outros documentos." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Pessoa</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentosFiltrados.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="flex items-center gap-2 font-medium">
                  <FileText className="size-4 text-gold" />
                  {doc.nome}
                </TableCell>
                <TableCell>{nomeCliente(doc)}</TableCell>
                <TableCell>{nomeVeiculo(doc)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{CATEGORIA_LABEL[doc.categoria] ?? doc.categoria}</Badge>
                </TableCell>
                <TableCell>{formatDate(doc.criadoEm)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
