"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Award, FileText, Wallet, AlertTriangle, Car, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { atualizarCliente, buscarClientePorId, excluirCliente } from "@/lib/services/clientes.service";
import { listarContratosPorCliente } from "@/lib/services/contratos.service";
import { listarParcelasPorContrato, obterParametrosFinanceiros } from "@/lib/services/financeiro.service";
import { listarMultasPorContrato } from "@/lib/services/multas.service";
import { listarVeiculos } from "@/lib/services/veiculos.service";
import { buscarScorePorCliente } from "@/lib/services/score.service";
import { buscarUsuarioPorId } from "@/lib/services/usuarios.service";
import { registrarAcao } from "@/lib/services/auditoria.service";
import { useAuth } from "@/lib/auth/auth-context";
import { calcularValorAtualizado } from "@/lib/calculations/juros-multa-correcao";
import { formatCurrency, formatDate, formatDocument } from "@/lib/utils/formatters";
import type {
  Cliente,
  Contrato,
  Multa,
  ParametrosFinanceiros,
  Parcela,
  ScoreLocatario,
  Usuario,
  Veiculo,
} from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/shared/status-pill";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClienteDetalhePage() {
  const params = useParams<{ clienteId: string }>();
  const router = useRouter();
  const { usuario: usuarioLogado } = useAuth();
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [usuario, setUsuario] = React.useState<Usuario | null>(null);
  const [contratos, setContratos] = React.useState<Contrato[]>([]);
  const [parcelas, setParcelas] = React.useState<Parcela[]>([]);
  const [multas, setMultas] = React.useState<Multa[]>([]);
  const [veiculos, setVeiculos] = React.useState<Veiculo[]>([]);
  const [parametros, setParametros] = React.useState<ParametrosFinanceiros | null>(null);
  const [score, setScore] = React.useState<ScoreLocatario | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [etapaExclusao, setEtapaExclusao] = React.useState<"aviso" | "confirmar" | null>(null);
  const [nomeDigitado, setNomeDigitado] = React.useState("");
  const [excluindo, setExcluindo] = React.useState(false);
  const [editandoDados, setEditandoDados] = React.useState(false);
  const [nacionalidade, setNacionalidade] = React.useState("");
  const [profissao, setProfissao] = React.useState("");
  const [banco, setBanco] = React.useState("");
  const [agencia, setAgencia] = React.useState("");
  const [conta, setConta] = React.useState("");
  const [chavePix, setChavePix] = React.useState("");
  const [salvandoDados, setSalvandoDados] = React.useState(false);

  async function handleExcluirCliente() {
    if (!cliente) return;
    setExcluindo(true);
    try {
      await excluirCliente(cliente.id);
      if (usuarioLogado) {
        await registrarAcao({
          usuarioId: usuarioLogado.id,
          usuarioNome: usuarioLogado.nome,
          acao: "Apagou o cliente",
          entidade: "Cliente",
          entidadeId: cliente.nome,
        });
      }
      toast.success("Cliente apagado com sucesso.");
      router.push("/admin/clientes");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível apagar o cliente.");
      setExcluindo(false);
    }
  }

  function abrirEdicaoDados() {
    if (!cliente) return;
    setNacionalidade(cliente.nacionalidade);
    setProfissao(cliente.profissao);
    setBanco(cliente.dadosBancarios.banco);
    setAgencia(cliente.dadosBancarios.agencia);
    setConta(cliente.dadosBancarios.conta);
    setChavePix(cliente.dadosBancarios.chavePix);
    setEditandoDados(true);
  }

  async function handleSalvarDados(event: React.FormEvent) {
    event.preventDefault();
    if (!cliente) return;
    setSalvandoDados(true);
    try {
      const atualizado = await atualizarCliente(cliente.id, {
        nacionalidade,
        profissao,
        dadosBancarios: { banco, agencia, conta, chavePix },
      });
      setCliente(atualizado);
      if (usuarioLogado) {
        await registrarAcao({
          usuarioId: usuarioLogado.id,
          usuarioNome: usuarioLogado.nome,
          acao: "Completou os dados do cliente",
          entidade: "Cliente",
          entidadeId: atualizado.nome,
        });
      }
      toast.success("Dados do cliente atualizados com sucesso!");
      setEditandoDados(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar os dados.");
    } finally {
      setSalvandoDados(false);
    }
  }

  function fecharDialogExclusao(open: boolean) {
    if (!open) {
      setEtapaExclusao(null);
      setNomeDigitado("");
    }
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    buscarClientePorId(params.clienteId).then(async (c) => {
      setCliente(c ?? null);
      if (!c) {
        setCarregando(false);
        return;
      }

      const [contratosCliente, params_, veiculosTodos, scoreCliente, usuarioCliente] = await Promise.all([
        listarContratosPorCliente(c.id),
        obterParametrosFinanceiros(),
        listarVeiculos(),
        buscarScorePorCliente(c.id),
        buscarUsuarioPorId(c.usuarioId),
      ]);
      setContratos(contratosCliente);
      setParametros(params_);
      setVeiculos(veiculosTodos);
      setScore(scoreCliente ?? null);
      setUsuario(usuarioCliente ?? null);

      const [parcelasPorContrato, multasPorContrato] = await Promise.all([
        Promise.all(contratosCliente.map((ct) => listarParcelasPorContrato(ct.id))),
        Promise.all(contratosCliente.map((ct) => listarMultasPorContrato(ct.id))),
      ]);
      setParcelas(parcelasPorContrato.flat());
      setMultas(multasPorContrato.flat());
      setCarregando(false);
    });
  }, [params.clienteId]);

  if (carregando || !cliente) return <Skeleton className="h-96 w-full" />;

  const totalPago = parcelas
    .filter((p) => p.status === "pago")
    .reduce((soma, p) => soma + p.valorOriginal, 0);
  const totalEmAberto = parametros
    ? parcelas
        .filter((p) => p.status === "em_aberto" || p.status === "vencido")
        .reduce((soma, p) => soma + calcularValorAtualizado(p, parametros).valorFinal, 0)
    : 0;
  const totalMultas = multas.reduce((soma, m) => soma + m.valor, 0);

  const contratosAtivos = contratos.filter((c) => c.status !== "encerrado");
  const veiculosEmUso = contratosAtivos
    .map((c) => veiculos.find((v) => v.id === c.veiculoId))
    .filter((v): v is Veiculo => Boolean(v));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{cliente.nome}</h1>
          <p className="text-sm text-muted-foreground">{formatDocument(cliente.documento)}</p>
        </div>
        <div className="flex items-center gap-2">
          {score && (
            <Badge variant="gold" className="gap-1.5 text-sm">
              <Award className="size-3.5" />
              {score.pontuacao} · {score.categoria}
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={abrirEdicaoDados}>
            <Pencil className="size-3.5" />
            Completar dados
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setEtapaExclusao("aviso")}>
            <Trash2 className="size-4" />
            Apagar cliente
          </Button>
        </div>
      </div>

      <Dialog open={editandoDados} onOpenChange={setEditandoDados}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar dados de {cliente.nome}</DialogTitle>
            <DialogDescription>Preencha o que estiver faltando no cadastro.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarDados} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-nacionalidade">Nacionalidade</Label>
                <Input
                  id="cliente-nacionalidade"
                  value={nacionalidade}
                  onChange={(e) => setNacionalidade(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-profissao">Profissão</Label>
                <Input
                  id="cliente-profissao"
                  value={profissao}
                  onChange={(e) => setProfissao(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-banco">Banco</Label>
                <Input id="cliente-banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-agencia">Agência</Label>
                <Input id="cliente-agencia" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-conta">Conta</Label>
                <Input id="cliente-conta" value={conta} onChange={(e) => setConta(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-pix">Chave PIX</Label>
                <Input id="cliente-pix" value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditandoDados(false)}
                disabled={salvandoDados}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoDados}>
                {salvandoDados ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total pago" value={formatCurrency(totalPago)} icon={Wallet} tone="success" />
        <StatCard label="Em aberto" value={formatCurrency(totalEmAberto)} icon={Wallet} tone="warning" />
        <StatCard
          label="Multas"
          value={`${multas.length} (${formatCurrency(totalMultas)})`}
          icon={AlertTriangle}
          tone="destructive"
        />
        <StatCard label="Veículos em uso" value={String(veiculosEmUso.length)} icon={Car} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados de contato</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Info label="Telefone" value={usuario?.telefone ?? ""} />
          <Info label="E-mail" value={usuario?.email ?? ""} />
          <Info label="Endereço" value={`${cliente.endereco.logradouro}, ${cliente.endereco.numero}`} />
          <Info label="Cidade/UF" value={`${cliente.endereco.cidade}/${cliente.endereco.estado}`} />
          <Info label="Cliente desde" value={formatDate(cliente.clienteDesde)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados bancários</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Info label="Banco" value={cliente.dadosBancarios.banco} />
          <Info label="Agência" value={cliente.dadosBancarios.agencia} />
          <Info label="Conta" value={cliente.dadosBancarios.conta} />
          <Info label="Chave PIX" value={cliente.dadosBancarios.chavePix} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Veículos em uso ({veiculosEmUso.length})
        </h2>
        {veiculosEmUso.length === 0 ? (
          <EmptyState icon={Car} title="Nenhum veículo em uso no momento" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {veiculosEmUso.map((veiculo) => (
              <Link key={veiculo.id} href={`/admin/veiculos/${veiculo.id}`}>
                <Card className="flex-row items-center gap-3 transition-colors hover:border-gold/40">
                  <Car className="size-4 shrink-0 text-gold" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {veiculo.marca} {veiculo.modelo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {veiculo.placa} · {veiculo.cor} · {veiculo.ano}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Contratos</h2>
        <div className="flex flex-col gap-3">
          {contratos.map((contrato) => (
            <Link key={contrato.id} href={`/admin/contratos/${contrato.id}`}>
              <Card className="flex-row items-center justify-between transition-colors hover:border-gold/40">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-gold" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Contrato {contrato.numero}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(contrato.dataInicio)} — {formatDate(contrato.dataFim)} ·{" "}
                      {formatCurrency(contrato.valorParcela)}/semana
                    </p>
                  </div>
                </div>
                <StatusPill status={contrato.status} />
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Multas de trânsito ({multas.length})</h2>
        {multas.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Nenhuma multa registrada" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auto</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pontos</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {multas.map((multa) => (
                <TableRow key={multa.id}>
                  <TableCell className="font-mono text-xs">{multa.numeroAuto}</TableCell>
                  <TableCell className="max-w-56 truncate">{multa.descricao}</TableCell>
                  <TableCell>{formatCurrency(multa.valor)}</TableCell>
                  <TableCell>{multa.pontos}</TableCell>
                  <TableCell>{formatDate(multa.vencimento)}</TableCell>
                  <TableCell>
                    <StatusPill status={multa.situacao} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={etapaExclusao === "aviso"} onOpenChange={fecharDialogExclusao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar {cliente.nome}?</DialogTitle>
            <DialogDescription>
              Essa ação é definitiva e não pode ser desfeita. Junto com o cliente, serão apagados
              todos os contratos, parcelas, extratos, multas, chamados, acordos, documentos e o
              score vinculados a ele.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => fecharDialogExclusao(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setEtapaExclusao("confirmar")}>
              Entendo, continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={etapaExclusao === "confirmar"} onOpenChange={fecharDialogExclusao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirme digitando o nome do cliente</DialogTitle>
            <DialogDescription>
              Para confirmar que você realmente quer apagar este cliente, digite{" "}
              <strong className="text-foreground">{cliente.nome}</strong> abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmacaoNome">Nome do cliente</Label>
            <Input
              id="confirmacaoNome"
              value={nomeDigitado}
              onChange={(e) => setNomeDigitado(e.target.value)}
              placeholder={cliente.nome}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => fecharDialogExclusao(false)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExcluirCliente}
              disabled={excluindo || nomeDigitado.trim() !== cliente.nome}
            >
              {excluindo ? "Apagando…" : "Apagar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
