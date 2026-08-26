"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Award, FileText, Wallet, AlertTriangle, Car, Trash2, Pencil, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  atualizarCliente,
  buscarClientePorId,
  excluirCliente,
  reenviarConviteCliente,
} from "@/lib/services/clientes.service";
import { listarContratosPorCliente } from "@/lib/services/contratos.service";
import { listarParcelasPorContrato, obterParametrosFinanceiros } from "@/lib/services/financeiro.service";
import { listarMultasPorContrato } from "@/lib/services/multas.service";
import { listarVeiculos } from "@/lib/services/veiculos.service";
import { buscarScorePorCliente } from "@/lib/services/score.service";
import { atualizarUsuario, buscarUsuarioPorId } from "@/lib/services/usuarios.service";
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

interface DadosEdicaveis {
  email: string;
  rg: string;
  nacionalidade: string;
  profissao: string;
  cnhNumero: string;
  cnhValidade: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

const DADOS_EDICAO_VAZIOS: DadosEdicaveis = {
  email: "",
  rg: "",
  nacionalidade: "",
  profissao: "",
  cnhNumero: "",
  cnhValidade: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

/** E-mail placeholder gerado quando o cliente foi cadastrado sem e-mail (ver `criarCliente`) —
 * nunca é um endereço de verdade, então conta como "ainda falta preencher". */
function emailPendente(email: string | undefined): boolean {
  return !email || email.endsWith("@zerotrezetransportes.pendente");
}

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
  const [dadosEdicao, setDadosEdicao] = React.useState<DadosEdicaveis>(DADOS_EDICAO_VAZIOS);
  const [salvandoDados, setSalvandoDados] = React.useState(false);
  const [reenviandoConvite, setReenviandoConvite] = React.useState(false);

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
    setDadosEdicao({
      email: emailPendente(usuario?.email) ? "" : (usuario?.email ?? ""),
      rg: cliente.rg,
      nacionalidade: cliente.nacionalidade,
      profissao: cliente.profissao,
      cnhNumero: cliente.cnh.numero,
      cnhValidade: cliente.cnh.validade ?? "",
      cep: cliente.endereco.cep,
      endereco: cliente.endereco.logradouro,
      numero: cliente.endereco.numero,
      complemento: cliente.endereco.complemento ?? "",
      bairro: cliente.endereco.bairro,
      cidade: cliente.endereco.cidade,
      uf: cliente.endereco.estado,
    });
    setEditandoDados(true);
  }

  function campoEdicao(campo: keyof DadosEdicaveis) {
    return {
      id: `cliente-${campo}`,
      value: dadosEdicao[campo],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setDadosEdicao((atual) => ({ ...atual, [campo]: e.target.value })),
    };
  }

  async function handleSalvarDados(event: React.FormEvent) {
    event.preventDefault();
    if (!cliente) return;
    setSalvandoDados(true);
    try {
      const atualizado = await atualizarCliente(cliente.id, {
        rg: dadosEdicao.rg,
        nacionalidade: dadosEdicao.nacionalidade,
        profissao: dadosEdicao.profissao,
        cnh: { numero: dadosEdicao.cnhNumero, validade: dadosEdicao.cnhValidade },
        endereco: {
          logradouro: dadosEdicao.endereco,
          numero: dadosEdicao.numero,
          complemento: dadosEdicao.complemento || undefined,
          bairro: dadosEdicao.bairro,
          cidade: dadosEdicao.cidade,
          estado: dadosEdicao.uf,
          cep: dadosEdicao.cep,
        },
      });
      setCliente(atualizado);

      const emailPreenchido = dadosEdicao.email.trim();
      if (emailPreenchido && emailPreenchido.toLowerCase() !== (usuario?.email ?? "").toLowerCase()) {
        const usuarioAtualizado = await atualizarUsuario(cliente.usuarioId, { email: emailPreenchido });
        setUsuario(usuarioAtualizado);
      }

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

  async function handleReenviarConvite() {
    if (!cliente) return;
    setReenviandoConvite(true);
    try {
      await reenviarConviteCliente(cliente.id);
      if (usuarioLogado) {
        await registrarAcao({
          usuarioId: usuarioLogado.id,
          usuarioNome: usuarioLogado.nome,
          acao: "Reenviou o convite de acesso por WhatsApp",
          entidade: "Cliente",
          entidadeId: cliente.nome,
        });
      }
      toast.success("Convite reenviado por WhatsApp com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reenviar o convite.");
    } finally {
      setReenviandoConvite(false);
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

  const camposFaltando: string[] = [];
  if (emailPendente(usuario?.email)) camposFaltando.push("e-mail");
  if (!cliente.rg.trim()) camposFaltando.push("RG");
  if (!cliente.nacionalidade.trim()) camposFaltando.push("nacionalidade");
  if (!cliente.profissao.trim()) camposFaltando.push("profissão");
  if (!cliente.cnh.numero.trim()) camposFaltando.push("número da CNH");
  if (!cliente.cnh.validade) camposFaltando.push("validade da CNH");
  if (!cliente.endereco.cep.trim()) camposFaltando.push("CEP");
  if (!cliente.endereco.logradouro.trim()) camposFaltando.push("endereço");
  if (!cliente.endereco.numero.trim()) camposFaltando.push("número do endereço");
  if (!cliente.endereco.bairro.trim()) camposFaltando.push("bairro");
  if (!cliente.endereco.cidade.trim()) camposFaltando.push("cidade");
  if (!cliente.endereco.estado.trim()) camposFaltando.push("UF");

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
          <Button size="sm" variant="outline" onClick={handleReenviarConvite} disabled={reenviandoConvite}>
            <Mail className="size-3.5" />
            {reenviandoConvite ? "Enviando…" : "Enviar convite via WhatsApp"}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setEtapaExclusao("aviso")}>
            <Trash2 className="size-4" />
            Apagar cliente
          </Button>
        </div>
      </div>

      {camposFaltando.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Cadastro incompleto — falta{camposFaltando.length > 1 ? "m" : ""}: {camposFaltando.join(", ")}.
          </span>
        </div>
      )}

      <Dialog open={editandoDados} onOpenChange={setEditandoDados}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completar dados de {cliente.nome}</DialogTitle>
            <DialogDescription>Preencha o que estiver faltando no cadastro.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarDados} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cliente-email">E-mail</Label>
              <Input type="email" {...campoEdicao("email")} placeholder="email@exemplo.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-rg">RG</Label>
                <Input {...campoEdicao("rg")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-nacionalidade">Nacionalidade</Label>
                <Input {...campoEdicao("nacionalidade")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-profissao">Profissão</Label>
                <Input {...campoEdicao("profissao")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-cnhNumero">Número da CNH</Label>
                <Input {...campoEdicao("cnhNumero")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-cnhValidade">Validade da CNH</Label>
                <Input type="date" {...campoEdicao("cnhValidade")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-cep">CEP</Label>
                <Input {...campoEdicao("cep")} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="cliente-endereco">Endereço</Label>
                <Input {...campoEdicao("endereco")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-numero">Número</Label>
                <Input {...campoEdicao("numero")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-complemento">Complemento</Label>
                <Input {...campoEdicao("complemento")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-bairro">Bairro</Label>
                <Input {...campoEdicao("bairro")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-cidade">Cidade</Label>
                <Input {...campoEdicao("cidade")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente-uf">UF</Label>
                <Input {...campoEdicao("uf")} maxLength={2} />
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
          <Info label="E-mail" value={emailPendente(usuario?.email) ? "" : (usuario?.email ?? "")} />
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
