/**
 * Popula o Supabase com o mesmo dataset de demonstração que o app usava em memória
 * (mesmos nomes/e-mails de `NOMES_CLIENTES`, senha "123456") — reaproveita os geradores puros de
 * `src/lib/mock-data/generators/*`, mas insere de verdade no banco em vez de empurrar pra um array.
 *
 * Uso:
 *   npx tsx scripts/seed-supabase.mts          — semeia (falha se já houver usuários)
 *   npx tsx scripts/seed-supabase.mts --reset  — apaga todo o dataset de demonstração e semeia de novo
 *
 * Não roda dentro do Next.js (é um script standalone), então os módulos protegidos por
 * `server-only` (lib/supabase/server.ts, lib/server/*.service.ts) não podem ser importados aqui —
 * este script cria seu próprio client do Supabase e monta os inserts diretamente.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker/locale/pt_BR";

import { gerarVeiculo } from "../src/lib/mock-data/generators/veiculo";
import { gerarCliente, gerarUsuarioCliente } from "../src/lib/mock-data/generators/cliente";
import { gerarContrato, formatarNumeroContrato } from "../src/lib/mock-data/generators/contrato";
import { gerarParcelas, gerarExtrato } from "../src/lib/mock-data/generators/financeiro";
import { gerarMulta } from "../src/lib/mock-data/generators/multa";
import { gerarChamado } from "../src/lib/mock-data/generators/chamado";
import { gerarNotificacao } from "../src/lib/mock-data/generators/notificacao";
import { gerarScore } from "../src/lib/mock-data/generators/score";
import { gerarDocumentosParaContrato } from "../src/lib/mock-data/generators/documento";
import { gerarAcordo } from "../src/lib/mock-data/generators/acordo";
import type { Contrato } from "../src/lib/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function carregarEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const texto = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const linha of texto.split("\n")) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = carregarEnv();
const SENHA_PADRAO = "123456";
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RESET = process.argv.includes("--reset");

faker.seed(1307);

const NOMES_CLIENTES = [
  "Amanda Pecanha",
  "Bruno Carvalho",
  "Camila Ferreira",
  "Diego Almeida",
  "Elisa Nogueira",
  "Fábio Teixeira",
  "Gabriela Rocha",
  "Henrique Duarte",
];

const USUARIOS_INTERNOS = [
  { nome: "Marcelo Andrade", email: "admin@zerotreze.com.br", telefone: "(11) 98888-0001", perfil: "administrador" },
  { nome: "Patrícia Lima", email: "gestor@zerotreze.com.br", telefone: "(11) 98888-0002", perfil: "gestor" },
  { nome: "Rafael Souza", email: "operador@zerotreze.com.br", telefone: "(11) 98888-0003", perfil: "operador" },
] as const;

const TOTAL_VEICULOS_FROTA = 16;

async function resetar() {
  console.log("--reset: apagando dataset de demonstração existente...");

  const { data: usuariosExistentes, error } = await supabase.from("usuarios").select("id");
  if (error) throw new Error(error.message);

  for (const usuario of usuariosExistentes ?? []) {
    const { error: delError } = await supabase.auth.admin.deleteUser(usuario.id);
    if (delError) console.warn(`  aviso: falha ao apagar usuário ${usuario.id}: ${delError.message}`);
  }
  console.log(`  ${usuariosExistentes?.length ?? 0} usuário(s) removido(s) (cascata apagou clientes/contratos/etc).`);

  // Não são donos de nenhum usuário — sobrevivem à cascata e precisam ser limpos à parte.
  await supabase.from("veiculos").delete().gte("ano", 0);
  await supabase.from("auditoria").delete().not("id", "is", null);
  await supabase.from("notificacoes_cobranca").delete().not("id", "is", null);
  console.log("  veículos, auditoria e notificações de cobrança avulsas limpos.");
}

async function verificarBancoVazio() {
  const { count, error } = await supabase.from("usuarios").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      `Já existem ${count} usuário(s) no banco. Rode com --reset para apagar o dataset de demonstração e semear de novo.`
    );
  }
}

async function criarUsuarioAuth(nome: string, email: string, telefone: string, perfil: string, cpfCnpj: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SENHA_PADRAO,
    email_confirm: true,
    user_metadata: { nome, telefone, cpf_cnpj: cpfCnpj },
    app_metadata: { perfil },
  });
  if (error || !data.user) throw new Error(`Falha ao criar usuário ${email}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  if (RESET) {
    await resetar();
  } else {
    await verificarBancoVazio();
  }

  console.log("\nCriando usuários internos (administrador/gestor/operador)...");
  for (const u of USUARIOS_INTERNOS) {
    await criarUsuarioAuth(u.nome, u.email, u.telefone, u.perfil, "");
    console.log(`  ${u.perfil}: ${u.email}`);
  }

  console.log("\nGerando frota de veículos...");
  const veiculosGerados = Array.from({ length: TOTAL_VEICULOS_FROTA }, () => gerarVeiculo());
  const { data: veiculosInseridos, error: veiculosError } = await supabase
    .from("veiculos")
    .insert(
      veiculosGerados.map((v) => ({
        id: v.id,
        modelo: v.modelo,
        marca: v.marca,
        ano: v.ano,
        cor: v.cor,
        placa: v.placa,
        renavam: v.renavam,
        chassi: v.chassi,
        categoria: v.categoria,
        combustivel: v.combustivel,
        quilometragem: v.quilometragem,
        foto_url: v.fotoUrl,
        ultima_revisao: v.ultimaRevisao,
        proxima_revisao: v.proximaRevisao,
        seguradora: v.seguradora,
        numero_apolice: v.numeroApolice,
        assistencia_247: v.assistencia247,
        garantia_ate: v.garantiaAte,
        bloqueado: false,
      }))
    )
    .select("id");
  if (veiculosError) throw new Error(veiculosError.message);
  console.log(`  ${veiculosInseridos.length} veículos criados.`);

  const historicoManutencaoRows = veiculosGerados.flatMap((v) =>
    v.historicoManutencao.map((h) => ({
      id: h.id,
      veiculo_id: v.id,
      data: h.data,
      km: h.km,
      descricao: h.descricao,
      oficina: h.oficina,
    }))
  );
  if (historicoManutencaoRows.length > 0) {
    const { error } = await supabase.from("historico_manutencao").insert(historicoManutencaoRows);
    if (error) throw new Error(error.message);
  }

  let proximoVeiculoIndex = 0;
  const contratosPorAno: Record<number, number> = {};
  let totalContratosCriados = 0;
  let totalParcelasCriadas = 0;
  let totalMultasCriadas = 0;
  let totalChamadosCriados = 0;
  let totalAcordosCriados = 0;
  let totalNotificacoesCriadas = 0;

  console.log("\nCriando clientes e seus dados interligados...");
  for (const nome of NOMES_CLIENTES) {
    // Remove acentos do primeiro nome — a API do Supabase Auth rejeita e-mails com caracteres
    // não-ASCII na parte local (ex.: "fábio@..." falha, "fabio@..." não).
    const primeiroNome = nome
      .split(" ")[0]
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    const email = `${primeiroNome}@exemplo.com`;
    const documento = faker.string.numeric(11);

    const usuarioClienteTmp = gerarUsuarioCliente(nome, email, documento);
    const usuarioId = await criarUsuarioAuth(nome, email, usuarioClienteTmp.telefone, "cliente", documento);

    const cliente = gerarCliente(usuarioId, nome);
    const { error: clienteError } = await supabase.from("clientes").insert({
      id: cliente.id,
      usuario_id: usuarioId,
      nome: cliente.nome,
      tipo_documento: cliente.tipoDocumento,
      documento: cliente.documento,
      rg: cliente.rg,
      nacionalidade: cliente.nacionalidade,
      profissao: cliente.profissao,
      data_nascimento: cliente.dataNascimento,
      cnh_numero: cliente.cnh.numero,
      cnh_validade: cliente.cnh.validade,
      endereco_logradouro: cliente.endereco.logradouro,
      endereco_numero: cliente.endereco.numero,
      endereco_complemento: cliente.endereco.complemento ?? null,
      endereco_bairro: cliente.endereco.bairro,
      endereco_cidade: cliente.endereco.cidade,
      endereco_estado: cliente.endereco.estado,
      endereco_cep: cliente.endereco.cep,
      banco: cliente.dadosBancarios.banco,
      agencia: cliente.dadosBancarios.agencia,
      conta: cliente.dadosBancarios.conta,
      chave_pix: cliente.dadosBancarios.chavePix,
      cliente_desde: cliente.clienteDesde,
    });
    if (clienteError) throw new Error(`Cliente ${nome}: ${clienteError.message}`);

    const score = gerarScore(cliente.id);
    const { data: scoreRow, error: scoreError } = await supabase
      .from("scores")
      .insert({
        cliente_id: cliente.id,
        pontuacao: score.pontuacao,
        categoria: score.categoria,
        pontualidade_pagamentos: score.pontualidadePagamentos,
        quantidade_atrasos: score.quantidadeAtrasos,
        tempo_como_cliente_meses: score.tempoComoClienteMeses,
        conservacao_veiculo: score.conservacaoVeiculo,
        quantidade_contratos: score.quantidadeContratos,
        quantidade_ocorrencias: score.quantidadeOcorrencias,
      })
      .select("id")
      .single();
    if (scoreError || !scoreRow) throw new Error(`Score de ${nome}: ${scoreError?.message}`);

    await supabase.from("historico_score").insert(
      score.historico.map((h) => ({ score_id: scoreRow.id, data: h.data, pontuacao: h.pontuacao }))
    );

    const totalContratosCliente = faker.number.int({ min: 1, max: 2 });
    for (let i = 0; i < totalContratosCliente; i++) {
      const veiculo = veiculosGerados[proximoVeiculoIndex % veiculosGerados.length];
      proximoVeiculoIndex++;
      const valorParcela = faker.number.float({ min: 550, max: 1300, fractionDigits: 2 });

      const dataInicioContrato = faker.date.past({ years: 1.5 });
      const anoContrato = dataInicioContrato.getFullYear();
      contratosPorAno[anoContrato] = (contratosPorAno[anoContrato] ?? 0) + 1;
      const numeroContrato = formatarNumeroContrato(anoContrato, contratosPorAno[anoContrato]);

      const contrato: Contrato = gerarContrato(cliente.id, veiculo.id, numeroContrato, dataInicioContrato, valorParcela);

      const parcelasContrato = gerarParcelas(contrato);
      const temParcelaVencida = parcelasContrato.some((p) => p.status === "vencido");
      if (temParcelaVencida && contrato.status !== "encerrado") {
        contrato.status = "atraso";
      }

      const { error: contratoError } = await supabase.from("contratos").insert({
        id: contrato.id,
        numero: contrato.numero,
        cliente_id: contrato.clienteId,
        veiculo_id: contrato.veiculoId,
        status: contrato.status,
        data_inicio: contrato.dataInicio,
        data_fim: contrato.dataFim,
        valor_parcela: contrato.valorParcela,
        valor_caucao: contrato.valorCaucao,
        limite_renovacao: contrato.limiteRenovacao,
        arquivo_url: contrato.arquivoUrl,
      });
      if (contratoError) throw new Error(`Contrato ${contrato.numero}: ${contratoError.message}`);
      totalContratosCriados++;

      if (contrato.aditivos.length > 0) {
        await supabase.from("aditivos_contrato").insert(
          contrato.aditivos.map((a) => ({
            id: a.id,
            contrato_id: contrato.id,
            tipo: a.tipo,
            descricao: a.descricao,
            data: a.data,
            arquivo_url: a.arquivoUrl,
          }))
        );
      }

      if (parcelasContrato.length > 0) {
        const { error } = await supabase.from("parcelas").insert(
          parcelasContrato.map((p) => ({
            id: p.id,
            contrato_id: contrato.id,
            numero: p.numero,
            competencia: p.competencia,
            valor_original: p.valorOriginal,
            data_vencimento: p.dataVencimento,
            data_pagamento: p.dataPagamento ?? null,
            status: p.status,
            forma_pagamento: p.formaPagamento ?? null,
          }))
        );
        if (error) throw new Error(`Parcelas do contrato ${contrato.numero}: ${error.message}`);
        totalParcelasCriadas += parcelasContrato.length;
      }

      const extrato = gerarExtrato(contrato, parcelasContrato);
      if (extrato.length > 0) {
        await supabase.from("movimentos_extrato").insert(
          extrato.map((m) => ({
            id: m.id,
            contrato_id: contrato.id,
            descricao: m.descricao,
            data: m.data,
            tipo: m.tipo,
            valor: m.valor,
            saldo: m.saldo,
          }))
        );
      }

      const documentos = gerarDocumentosParaContrato(cliente.id, contrato.id);
      if (documentos.length > 0) {
        await supabase.from("documentos").insert(
          documentos.map((d) => ({
            id: d.id,
            cliente_id: d.clienteId,
            contrato_id: d.contratoId,
            categoria: d.categoria,
            nome: d.nome,
            url: d.url,
            tamanho_kb: d.tamanhoKb,
            criado_em: d.criadoEm,
          }))
        );
      }

      const totalMultas = faker.number.int({ min: 0, max: 3 });
      for (let m = 0; m < totalMultas; m++) {
        const multa = gerarMulta(contrato.id);
        const { error } = await supabase.from("multas").insert({
          id: multa.id,
          contrato_id: multa.contratoId,
          numero_auto: multa.numeroAuto,
          orgao: multa.orgao,
          data: multa.data,
          descricao: multa.descricao,
          valor: multa.valor,
          vencimento: multa.vencimento,
          situacao: multa.situacao,
          pontos: multa.pontos,
          data_registro: multa.dataRegistro,
          ciencia_em: multa.cienciaEm ?? null,
        });
        if (error) throw new Error(`Multa de ${nome}: ${error.message}`);
        totalMultasCriadas++;
      }

      const totalChamados = faker.number.int({ min: 0, max: 2 });
      for (let c = 0; c < totalChamados; c++) {
        const chamado = gerarChamado(cliente.id, cliente.nome, contrato.id);
        const { error: chamadoError } = await supabase.from("chamados").insert({
          id: chamado.id,
          numero: chamado.numero,
          cliente_id: chamado.clienteId,
          contrato_id: chamado.contratoId,
          categoria: chamado.categoria,
          titulo: chamado.titulo,
          status: chamado.status,
          prioridade: chamado.prioridade,
          criado_em: chamado.criadoEm,
          atualizado_em: chamado.atualizadoEm,
        });
        if (chamadoError) throw new Error(`Chamado de ${nome}: ${chamadoError.message}`);

        await supabase.from("mensagens").insert(
          chamado.mensagens.map((msg) => ({
            id: msg.id,
            chamado_id: chamado.id,
            autor_id: msg.autorPerfil === "cliente" ? usuarioId : null,
            autor_nome: msg.autorNome,
            autor_perfil: msg.autorPerfil,
            texto: msg.texto ?? null,
            enviada_em: msg.enviadaEm,
            status: msg.status,
          }))
        );
        totalChamadosCriados++;
      }

      if (temParcelaVencida && faker.datatype.boolean({ probability: 0.4 })) {
        const acordo = gerarAcordo(cliente.id, contrato.id, valorParcela);
        const { error: acordoError } = await supabase.from("acordos").insert({
          id: acordo.id,
          numero: acordo.numero,
          cliente_id: acordo.clienteId,
          contrato_id: acordo.contratoId,
          valor_total: acordo.valorTotal,
          valor_entrada: acordo.valorEntrada,
          valor_divida_original: acordo.valorDividaOriginal ?? null,
          periodicidade: acordo.periodicidade,
          situacao: acordo.situacao,
          criado_em: acordo.criadoEm,
        });
        if (acordoError) throw new Error(`Acordo de ${nome}: ${acordoError.message}`);

        await supabase.from("parcelas_acordo").insert(
          acordo.cronograma.map((p) => ({
            acordo_id: acordo.id,
            numero: p.numero,
            valor: p.valor,
            vencimento: p.vencimento,
            status: p.status,
          }))
        );
        totalAcordosCriados++;
      }
    }

    const totalNotificacoes = faker.number.int({ min: 2, max: 5 });
    const notificacoesCliente = Array.from({ length: totalNotificacoes }, () => gerarNotificacao(usuarioId));
    const { error: notifError } = await supabase.from("notificacoes").insert(
      notificacoesCliente.map((n) => ({
        id: n.id,
        usuario_id: n.usuarioId,
        tipo: n.tipo,
        titulo: n.titulo,
        mensagem: n.mensagem,
        lida: n.lida,
        criado_em: n.criadoEm,
        link: n.link ?? null,
      }))
    );
    if (notifError) throw new Error(`Notificações de ${nome}: ${notifError.message}`);
    totalNotificacoesCriadas += notificacoesCliente.length;

    console.log(`  ${nome} (${email}) — ${totalContratosCliente} contrato(s)`);
  }

  console.log("\n=== Resumo ===");
  console.log(`Usuários internos: ${USUARIOS_INTERNOS.length}`);
  console.log(`Clientes: ${NOMES_CLIENTES.length}`);
  console.log(`Veículos: ${veiculosInseridos.length}`);
  console.log(`Contratos: ${totalContratosCriados}`);
  console.log(`Parcelas: ${totalParcelasCriadas}`);
  console.log(`Multas: ${totalMultasCriadas}`);
  console.log(`Chamados: ${totalChamadosCriados}`);
  console.log(`Acordos: ${totalAcordosCriados}`);
  console.log(`Notificações: ${totalNotificacoesCriadas}`);
  console.log("\nSenha de todas as contas de demonstração: 123456");
}

main().catch((error) => {
  console.error("\nFalha ao semear o banco:", error.message ?? error);
  process.exit(1);
});
