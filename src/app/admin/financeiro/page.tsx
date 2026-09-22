"use client";

import * as React from "react";
import { Eye, Wallet, Clock } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { listarContratos } from "@/lib/services/contratos.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { listarVeiculos } from "@/lib/services/veiculos.service";
import {
  listarParcelasAtivas,
  listarParcelasPagas,
  listarTodasAsParcelas,
  somaValorPago,
  obterParametrosFinanceiros,
  aplicarDescontoParcela,
  darBaixaManual,
} from "@/lib/services/financeiro.service";
import {
  confirmarPagamentoParcial,
  listarPagamentosParciaisPendentes,
  recusarPagamentoParcial,
} from "@/lib/services/pagamentos-parciais.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { formatCurrency, formatDate, parseData } from "@/lib/utils/formatters";
import type {
  Cliente,
  Contrato,
  PagamentoParcial,
  ParametrosFinanceiros,
  Parcela,
  StatusParcela,
  Veiculo,
} from "@/lib/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelectBusca } from "@/components/ui/select-busca";
import { StatCard } from "@/components/shared/stat-card";
import { StatusPill } from "@/components/shared/status-pill";
import { RevisarPagamentoDialog } from "@/components/shared/revisar-pagamento-dialog";
import {
  ParcelaDetalheDialog,
  type BaixaManualInput,
  type DescontoParcelaInput,
} from "@/components/shared/parcela-detalhe-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

type Filtro = "todos" | StatusParcela;
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "vencido", label: "Vencido" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "aguardando_confirmacao", label: "Aguardando confirmação" },
  { value: "pago", label: "Pago" },
  { value: "todos", label: "Todos" },
];

const TODOS = "todos";

interface LinhaParcela {
  parcela: Parcela;
  clienteId: string;
  clienteNome: string;
  veiculoId: string;
  veiculoNome: string;
  contratoNumero: string;
}

interface LinhaPagamentoPendente {
  pagamento: PagamentoParcial;
  clienteId: string;
  clienteNome: string;
  veiculoId: string;
  veiculoNome: string;
  contratoNumero: string;
  parcelaNumero: number;
  parcelaCompetencia: string;
}

/** Uma parcela "em_aberto" cujo vencimento já passou é, na prática, vencida — mesmo que o status
 * gravado no banco ainda não tenha sido atualizado (isso só acontece quando alguém lê a aba
 * Financeiro daquele contrato específico). Decidir isso aqui, na leitura, evita depender de
 * qualquer sincronização rodar antes: o dashboard fica correto e rápido ao mesmo tempo. */
function comStatusEfetivo(parcela: Parcela): Parcela {
  if (parcela.status === "em_aberto" && parseData(parcela.dataVencimento).getTime() < Date.now()) {
    return { ...parcela, status: "vencido" };
  }
  return parcela;
}

function montarLinhas(
  parcelas: Parcela[],
  mapaContratos: Map<string, Contrato>,
  mapaClientes: Map<string, Cliente>,
  mapaVeiculos: Map<string, Veiculo>
): LinhaParcela[] {
  const resultado: LinhaParcela[] = [];
  for (const parcela of parcelas) {
    const contrato = mapaContratos.get(parcela.contratoId);
    if (!contrato) continue;
    const veiculo = mapaVeiculos.get(contrato.veiculoId);
    resultado.push({
      parcela,
      clienteId: contrato.clienteId,
      clienteNome: mapaClientes.get(contrato.clienteId)?.nome ?? "—",
      veiculoId: contrato.veiculoId,
      veiculoNome: veiculo ? `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}` : "—",
      contratoNumero: contrato.numero,
    });
  }
  return resultado;
}

function montarLinhasPagamentos(
  pagamentos: PagamentoParcial[],
  mapaParcelas: Map<string, Parcela>,
  mapaContratos: Map<string, Contrato>,
  mapaClientes: Map<string, Cliente>,
  mapaVeiculos: Map<string, Veiculo>
): LinhaPagamentoPendente[] {
  const resultado: LinhaPagamentoPendente[] = [];
  for (const pagamento of pagamentos) {
    const parcela = mapaParcelas.get(pagamento.parcelaId);
    if (!parcela) continue;
    const contrato = mapaContratos.get(parcela.contratoId);
    if (!contrato) continue;
    const veiculo = mapaVeiculos.get(contrato.veiculoId);
    resultado.push({
      pagamento,
      clienteId: contrato.clienteId,
      clienteNome: mapaClientes.get(contrato.clienteId)?.nome ?? "—",
      veiculoId: contrato.veiculoId,
      veiculoNome: veiculo ? `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}` : "—",
      contratoNumero: contrato.numero,
      parcelaNumero: parcela.numero,
      parcelaCompetencia: parcela.competencia,
    });
  }
  return resultado;
}

export default function AdminFinanceiroPage() {
  const { usuario } = useAuth();

  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = React.useState<Veiculo[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);
  const [totalPago, setTotalPago] = React.useState<number | null>(null);

  // "Ativas" (em_aberto, vencido) carrega no mount — é o que alimenta as abas Vencido/Em aberto e
  // os cards de total, sem precisar buscar as parcelas já pagas (a maioria histórica). Pago e
  // Todos só buscam quando o admin clica neles. "Pendentes" é a fila de pagamentos parciais
  // aguardando confirmação — também carrega no mount, é o que alimenta a aba "Aguardando
  // confirmação".
  const [parcelasAtivas, setParcelasAtivas] = React.useState<Parcela[] | null>(null);
  const [parcelasPagas, setParcelasPagas] = React.useState<Parcela[] | null>(null);
  const [parcelasTodas, setParcelasTodas] = React.useState<Parcela[] | null>(null);
  const [pagamentosPendentes, setPagamentosPendentes] = React.useState<PagamentoParcial[] | null>(null);

  const [filtro, setFiltro] = React.useState<Filtro>("vencido");
  const [filtroClienteId, setFiltroClienteId] = React.useState(TODOS);
  const [filtroVeiculoId, setFiltroVeiculoId] = React.useState(TODOS);
  const [revisando, setRevisando] = React.useState<LinhaPagamentoPendente | null>(null);
  const [parcelaDetalhe, setParcelaDetalhe] = React.useState<LinhaParcela | null>(null);

  async function recarregarAtivas() {
    const [ativas, soma, pendentes] = await Promise.all([
      listarParcelasAtivas(),
      somaValorPago(),
      listarPagamentosParciaisPendentes(),
    ]);
    setParcelasAtivas(ativas);
    setTotalPago(soma);
    setPagamentosPendentes(pendentes);
    // invalida o cache de Pago/Todos — se o admin visitar essas abas de novo, busca fresco.
    setParcelasPagas(null);
    setParcelasTodas(null);
  }

  React.useEffect(() => {
    listarContratos().then(setContratos);
    listarClientes().then(setClientes);
    listarVeiculos().then(setVeiculos);
    obterParametrosFinanceiros().then(setParametros);
    listarParcelasAtivas().then(setParcelasAtivas);
    somaValorPago().then(setTotalPago);
    listarPagamentosParciaisPendentes().then(setPagamentosPendentes);
  }, []);

  const filtroClienteOuVeiculoAtivo = filtroClienteId !== TODOS || filtroVeiculoId !== TODOS;

  React.useEffect(() => {
    // Com cliente/carro filtrado, o card "Total recebido" precisa das parcelas pagas de verdade
    // (não só a soma global) pra mostrar quanto aquele cliente específico já pagou.
    if ((filtro === "pago" || filtro === "todos" || filtroClienteOuVeiculoAtivo) && parcelasPagas === null) {
      listarParcelasPagas().then(setParcelasPagas);
    }
    if (filtro === "todos" && parcelasTodas === null) {
      listarTodasAsParcelas().then(setParcelasTodas);
    }
  }, [filtro, filtroClienteOuVeiculoAtivo, parcelasPagas, parcelasTodas]);

  async function handleConfirmar(pagamentoId: string) {
    try {
      await confirmarPagamentoParcial(pagamentoId);
      if (usuario && revisando) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Confirmou um pagamento parcial",
          entidade: "Parcela",
          entidadeId: `${revisando.contratoNumero} · parcela ${revisando.parcelaNumero}`,
        });
      }
      toast.success("Pagamento confirmado. O saldo da parcela já foi atualizado.");
      setRevisando(null);
      await recarregarAtivas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível confirmar o pagamento.");
    }
  }

  async function handleRecusar(pagamentoId: string) {
    try {
      await recusarPagamentoParcial(pagamentoId);
      if (usuario && revisando) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Recusou um pagamento parcial",
          entidade: "Parcela",
          entidadeId: `${revisando.contratoNumero} · parcela ${revisando.parcelaNumero}`,
        });
      }
      toast.success("Pagamento recusado.");
      setRevisando(null);
      await recarregarAtivas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível recusar o pagamento.");
    }
  }

  async function handleAplicarDesconto(parcelaId: string, desconto: DescontoParcelaInput) {
    try {
      const atualizada = await aplicarDescontoParcela(parcelaId, desconto, usuario?.nome ?? "Administrador");
      if (parcelaDetalhe) setParcelaDetalhe({ ...parcelaDetalhe, parcela: atualizada });
      if (usuario && parcelaDetalhe) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Aplicou desconto em uma parcela",
          entidade: "Parcela",
          entidadeId: `${parcelaDetalhe.contratoNumero} · parcela ${atualizada.numero}`,
        });
      }
      toast.success(atualizada.desconto ? "Desconto aplicado com sucesso." : "Desconto removido.");
      await recarregarAtivas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar o desconto.");
    }
  }

  async function handleDarBaixa(parcelaId: string, dados: BaixaManualInput) {
    try {
      const atualizada = await darBaixaManual(parcelaId, dados, usuario?.nome ?? "Administrador");
      if (parcelaDetalhe) setParcelaDetalhe({ ...parcelaDetalhe, parcela: atualizada });
      if (usuario && parcelaDetalhe) {
        await registrarAcao({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "Deu baixa manual num pagamento",
          entidade: "Parcela",
          entidadeId: `${parcelaDetalhe.contratoNumero} · parcela ${atualizada.numero}`,
        });
      }
      toast.success("Baixa registrada — a parcela já está marcada como paga.");
      await recarregarAtivas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível dar baixa no pagamento.");
    }
  }

  if (!parametros || !parcelasAtivas || totalPago === null || !pagamentosPendentes) {
    return <Skeleton className="h-96 w-full" />;
  }

  const mapaClientes = new Map<string, Cliente>(clientes.map((c) => [c.id, c]));
  const mapaVeiculos = new Map<string, Veiculo>(veiculos.map((v) => [v.id, v]));
  const mapaContratos = new Map<string, Contrato>(contratos.map((c) => [c.id, c]));
  const mapaParcelas = new Map<string, Parcela>(parcelasAtivas.map((p) => [p.id, p]));

  const linhasAtivas = montarLinhas(parcelasAtivas.map(comStatusEfetivo), mapaContratos, mapaClientes, mapaVeiculos);
  const linhasPagas = parcelasPagas ? montarLinhas(parcelasPagas, mapaContratos, mapaClientes, mapaVeiculos) : null;
  const linhasTodas = parcelasTodas ? montarLinhas(parcelasTodas, mapaContratos, mapaClientes, mapaVeiculos) : null;
  const linhasPendentes = montarLinhasPagamentos(pagamentosPendentes, mapaParcelas, mapaContratos, mapaClientes, mapaVeiculos);

  const linhasAtuais: LinhaParcela[] | null =
    filtro === "pago" ? linhasPagas : filtro === "todos" ? linhasTodas : linhasAtivas;

  const filtradas = (linhasAtuais ?? []).filter((l) => {
    if (filtro !== "todos" && l.parcela.status !== filtro) return false;
    if (filtroClienteId !== TODOS && l.clienteId !== filtroClienteId) return false;
    if (filtroVeiculoId !== TODOS && l.veiculoId !== filtroVeiculoId) return false;
    return true;
  });

  // Os cards de total respeitam o filtro de cliente/carro selecionado — cada card já representa
  // um status específico (pago / em_aberto+vencido / aguardando_confirmacao), então basta cruzar
  // com o mesmo filtro usado na tabela.
  function bateComFiltroClienteVeiculo(l: { clienteId: string; veiculoId: string }): boolean {
    if (filtroClienteId !== TODOS && l.clienteId !== filtroClienteId) return false;
    if (filtroVeiculoId !== TODOS && l.veiculoId !== filtroVeiculoId) return false;
    return true;
  }

  const linhasAtivasFiltradas = linhasAtivas.filter(bateComFiltroClienteVeiculo);
  const linhasPendentesFiltradas = linhasPendentes.filter(bateComFiltroClienteVeiculo);

  const totalEmAberto = linhasAtivasFiltradas
    .filter((l) => l.parcela.status === "em_aberto" || l.parcela.status === "vencido")
    .reduce((soma, l) => soma + calcularValorAtualizado(l.parcela, parametros).valorFinal, 0);
  const totalMultas = linhasAtivasFiltradas
    .filter((l) => l.parcela.status === "em_aberto" || l.parcela.status === "vencido")
    .reduce((soma, l) => soma + calcularValorAtualizado(l.parcela, parametros).multa, 0);

  // Sem filtro, usa a soma global (rápida, já carregada no mount). Com filtro, precisa das
  // parcelas pagas de verdade pra somar só as daquele cliente/carro — enquanto isso carrega
  // (linhasPagas ainda null), mostra "…" em vez de um número errado.
  const totalPagoFiltrado = linhasPagas
    ? linhasPagas.filter(bateComFiltroClienteVeiculo).reduce((soma, l) => soma + l.parcela.valorOriginal, 0)
    : null;
  const totalPagoExibido = filtroClienteOuVeiculoAtivo ? totalPagoFiltrado : totalPago;

  // Ao escolher um cliente, só faz sentido oferecer no filtro de carro os veículos que ele já
  // teve em algum contrato — e vice-versa — senão a combinação dos dois filtros sempre dá lista
  // vazia. Baseado nas parcelas ativas (o conjunto mais amplo já carregado), não numa aba
  // específica.
  const veiculosDisponiveis =
    filtroClienteId === TODOS
      ? veiculos
      : veiculos.filter((v) => linhasAtivas.some((l) => l.clienteId === filtroClienteId && l.veiculoId === v.id));

  const clientesDisponiveis =
    filtroVeiculoId === TODOS
      ? clientes
      : clientes.filter((c) => linhasAtivas.some((l) => l.veiculoId === filtroVeiculoId && l.clienteId === c.id));

  function handleFiltroCliente(novoClienteId: string) {
    setFiltroClienteId(novoClienteId);
    if (
      novoClienteId !== TODOS &&
      filtroVeiculoId !== TODOS &&
      !linhasAtivas.some((l) => l.clienteId === novoClienteId && l.veiculoId === filtroVeiculoId)
    ) {
      setFiltroVeiculoId(TODOS);
    }
  }

  function handleFiltroVeiculo(novoVeiculoId: string) {
    setFiltroVeiculoId(novoVeiculoId);
    if (
      novoVeiculoId !== TODOS &&
      filtroClienteId !== TODOS &&
      !linhasAtivas.some((l) => l.veiculoId === novoVeiculoId && l.clienteId === filtroClienteId)
    ) {
      setFiltroClienteId(TODOS);
    }
  }

  const mostrandoAguardando = filtro === "aguardando_confirmacao";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Financeiro</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total recebido"
          value={totalPagoExibido === null ? "…" : formatCurrency(totalPagoExibido)}
          icon={Wallet}
          tone="success"
          hint={filtroClienteOuVeiculoAtivo ? "Filtrado" : undefined}
        />
        <StatCard
          label="Total em aberto"
          value={formatCurrency(totalEmAberto)}
          icon={Wallet}
          tone="warning"
          hint={filtroClienteOuVeiculoAtivo ? "Filtrado" : undefined}
        />
        <StatCard
          label="Multas em aberto"
          value={formatCurrency(totalMultas)}
          icon={Wallet}
          tone="destructive"
          hint={filtroClienteOuVeiculoAtivo ? "Filtrado" : undefined}
        />
        <StatCard
          label="Aguardando confirmação"
          value={String(linhasPendentesFiltradas.length)}
          icon={Clock}
          tone="warning"
          hint={filtroClienteOuVeiculoAtivo ? "Filtrado" : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filtro === f.value ? "default" : "outline"}
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <SelectBusca
          value={filtroClienteId}
          onValueChange={handleFiltroCliente}
          placeholder="Filtrar por cliente"
          searchPlaceholder="Buscar cliente…"
          className="w-56"
          options={[
            { value: TODOS, label: "Todos os clientes" },
            ...clientesDisponiveis.map((cliente) => ({ value: cliente.id, label: cliente.nome })),
          ]}
        />

        <SelectBusca
          value={filtroVeiculoId}
          onValueChange={handleFiltroVeiculo}
          placeholder="Filtrar por carro"
          searchPlaceholder="Buscar veículo…"
          className="w-56"
          options={[
            { value: TODOS, label: "Todos os carros" },
            ...veiculosDisponiveis.map((veiculo) => ({
              value: veiculo.id,
              label: `${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`,
            })),
          ]}
        />
      </div>

      {mostrandoAguardando ? (
        linhasPendentesFiltradas.length === 0 ? (
          <EmptyState icon={Clock} title="Nenhum pagamento aguardando confirmação" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Carro</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Valor enviado</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhasPendentesFiltradas.slice(0, 100).map((linha) => (
                <TableRow key={linha.pagamento.id}>
                  <TableCell>{linha.clienteNome}</TableCell>
                  <TableCell>{linha.veiculoNome}</TableCell>
                  <TableCell>{linha.contratoNumero}</TableCell>
                  <TableCell>{linha.parcelaNumero}</TableCell>
                  <TableCell>{formatCurrency(linha.pagamento.valor)}</TableCell>
                  <TableCell>{formatDate(linha.pagamento.enviadoEm)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setRevisando(linha)}>
                      <Clock className="size-4" />
                      Revisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : linhasAtuais === null ? (
        <Skeleton className="h-96 w-full" />
      ) : filtradas.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma parcela encontrada" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Valor atualizado</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.slice(0, 100).map((linha) => {
              const { parcela, clienteNome, veiculoNome, contratoNumero } = linha;
              const atualizado = calcularValorAtualizado(parcela, parametros);
              return (
                <TableRow key={parcela.id}>
                  <TableCell>{clienteNome}</TableCell>
                  <TableCell>{veiculoNome}</TableCell>
                  <TableCell>{contratoNumero}</TableCell>
                  <TableCell>{parcela.numero}</TableCell>
                  <TableCell>{formatCurrency(atualizado.valorFinal)}</TableCell>
                  <TableCell>{formatDate(parcela.dataVencimento)}</TableCell>
                  <TableCell>
                    <StatusPill status={parcela.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setParcelaDetalhe(linha)}
                      aria-label="Visualizar parcela"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <RevisarPagamentoDialog
        pagamento={revisando?.pagamento ?? null}
        clienteNome={revisando?.clienteNome ?? ""}
        contratoNumero={revisando?.contratoNumero ?? ""}
        parcelaNumero={revisando?.parcelaNumero ?? 0}
        parcelaCompetencia={revisando?.parcelaCompetencia ?? ""}
        open={revisando !== null}
        onOpenChange={(open) => !open && setRevisando(null)}
        onConfirmar={handleConfirmar}
        onRecusar={handleRecusar}
      />

      <ParcelaDetalheDialog
        parcela={parcelaDetalhe?.parcela ?? null}
        parametros={parametros}
        open={parcelaDetalhe !== null}
        onOpenChange={(open) => !open && setParcelaDetalhe(null)}
        podeAplicarDesconto
        onAplicarDesconto={handleAplicarDesconto}
        podeDarBaixa
        onDarBaixa={handleDarBaixa}
      />
    </div>
  );
}
