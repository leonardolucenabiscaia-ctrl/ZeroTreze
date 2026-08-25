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
import { SelectBusca } from "@/components/ui/select-busca";
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

  // Ao escolher uma pessoa, só faz sentido oferecer no filtro de veículo os carros que ela
  // já teve em algum contrato — e vice-versa — senão a combinação dos dois filtros sempre dá
  // lista vazia.
  const veiculosDisponiveis =
    filtroClienteId === TODOS
      ? veiculos
      : veiculos.filter((v) => contratos.some((c) => c.clienteId === filtroClienteId && c.veiculoId === v.id));

  const clientesDisponiveis =
    filtroVeiculoId === TODOS
      ? clientes
      : clientes.filter((c) => contratos.some((ct) => ct.veiculoId === filtroVeiculoId && ct.clienteId === c.id));

  function handleFiltroCliente(novoClienteId: string) {
    setFiltroClienteId(novoClienteId);
    if (
      novoClienteId !== TODOS &&
      filtroVeiculoId !== TODOS &&
      !contratos.some((c) => c.clienteId === novoClienteId && c.veiculoId === filtroVeiculoId)
    ) {
      setFiltroVeiculoId(TODOS);
    }
  }

  function handleFiltroVeiculo(novoVeiculoId: string) {
    setFiltroVeiculoId(novoVeiculoId);
    if (
      novoVeiculoId !== TODOS &&
      filtroClienteId !== TODOS &&
      !contratos.some((c) => c.veiculoId === novoVeiculoId && c.clienteId === filtroClienteId)
    ) {
      setFiltroClienteId(TODOS);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Documentos</h1>

      <div className="flex flex-wrap gap-2">
        <SelectBusca
          value={filtroClienteId}
          onValueChange={handleFiltroCliente}
          placeholder="Filtrar por pessoa"
          searchPlaceholder="Buscar pessoa…"
          className="w-56"
          options={[
            { value: TODOS, label: "Todas as pessoas" },
            ...clientesDisponiveis.map((cliente) => ({ value: cliente.id, label: cliente.nome })),
          ]}
        />

        <SelectBusca
          value={filtroVeiculoId}
          onValueChange={handleFiltroVeiculo}
          placeholder="Filtrar por veículo"
          searchPlaceholder="Buscar veículo…"
          className="w-56"
          options={[
            { value: TODOS, label: "Todos os veículos" },
            ...veiculosDisponiveis.map((veiculo) => ({
              value: veiculo.id,
              label: `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`,
            })),
          ]}
        />
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
