import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { categoriaPorPontuacao } from "@/lib/calculations/score";
import { convidarUsuario, reenviarCodigoAcesso } from "./auth-invite";
import { mapCliente } from "./mappers";
import type { Cliente } from "@/lib/types";

export async function listarClientes(): Promise<Cliente[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("clientes").select("*").order("cliente_desde", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCliente);
}

export async function buscarClientePorId(id: string): Promise<Cliente | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  return data ? mapCliente(data) : undefined;
}

export async function buscarClientePorUsuarioId(usuarioId: string): Promise<Cliente | undefined> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("clientes").select("*").eq("usuario_id", usuarioId).maybeSingle();
  return data ? mapCliente(data) : undefined;
}

/**
 * Apaga o cliente definitivamente — remove a conta do Supabase Auth, o que em cascata (FKs
 * `on delete cascade`) apaga a linha em `clientes` e tudo que depende dela: contratos, parcelas,
 * movimentos de extrato, multas, chamados, mensagens, avaliações, acordos, documentos, score e
 * notificações. Ação irreversível — a confirmação fica a cargo da UI.
 */
export async function excluirCliente(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: clienteRow, error } = await supabase
    .from("clientes")
    .select("usuario_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!clienteRow) throw new Error("Cliente não encontrado");

  const { error: deleteError } = await supabase.auth.admin.deleteUser(clienteRow.usuario_id);
  if (deleteError) throw new Error(deleteError.message);
}

/** Reenvia o código de primeiro acesso por WhatsApp pro cliente — útil quando o convite
 * original não chegou. */
export async function reenviarConviteCliente(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: clienteRow } = await supabase.from("clientes").select("usuario_id").eq("id", id).maybeSingle();
  if (!clienteRow) throw new Error("Cliente não encontrado");

  await reenviarCodigoAcesso(clienteRow.usuario_id);
}

export async function atualizarCliente(id: string, dados: Partial<Cliente>): Promise<Cliente> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (dados.nome !== undefined) patch.nome = dados.nome;
  if (dados.rg !== undefined) patch.rg = dados.rg;
  if (dados.nacionalidade !== undefined) patch.nacionalidade = dados.nacionalidade;
  if (dados.profissao !== undefined) patch.profissao = dados.profissao;
  if (dados.dataNascimento !== undefined) patch.data_nascimento = dados.dataNascimento || null;
  if (dados.cnh !== undefined) {
    patch.cnh_numero = dados.cnh.numero;
    patch.cnh_validade = dados.cnh.validade || null;
  }
  if (dados.endereco !== undefined) {
    patch.endereco_logradouro = dados.endereco.logradouro;
    patch.endereco_numero = dados.endereco.numero;
    patch.endereco_complemento = dados.endereco.complemento ?? null;
    patch.endereco_bairro = dados.endereco.bairro;
    patch.endereco_cidade = dados.endereco.cidade;
    patch.endereco_estado = dados.endereco.estado;
    patch.endereco_cep = dados.endereco.cep;
  }
  if (dados.dadosBancarios !== undefined) {
    patch.banco = dados.dadosBancarios.banco;
    patch.agencia = dados.dadosBancarios.agencia;
    patch.conta = dados.dadosBancarios.conta;
    patch.chave_pix = dados.dadosBancarios.chavePix;
  }

  const { data, error } = await supabase.from("clientes").update(patch).eq("id", id).select().single();
  if (error || !data) throw new Error("Cliente não encontrado");
  return mapCliente(data);
}

export interface NovoClienteInput {
  nomeCompleto: string;
  email: string;
  cpf: string;
  rg: string;
  nacionalidade: string;
  profissao: string;
  telefone: string;
  dataNascimento: string;
  cnhNumero: string;
  cnhValidade: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  anexos: File[];
}

/** Domínio reservado só pra e-mail placeholder de cliente cadastrado sem e-mail (ver
 * `criarCliente`) — nunca é usado pra enviar nada de verdade, então não precisa existir de fato.
 * Detectável depois (ex.: pra avisar que falta completar o e-mail antes de mandar algo pra
 * assinatura eletrônica). */
const DOMINIO_EMAIL_PENDENTE = "zerotrezetransportes.pendente";

/** Convida o cliente por e-mail (perfil "cliente", sem senha definida pelo admin — ver
 * `convidarUsuario`) + linha em `clientes` + score inicial (500 pontos) + um documento por anexo
 * enviado (metadados apenas — sem armazenamento de arquivo real configurado ainda).
 *
 * Até 2 campos não-essenciais (e-mail incluso) podem vir em branco — o limite em si é aplicado
 * na tela ("Novo cliente"), aqui só aceita o que chegar. Sem e-mail, o Supabase Auth ainda exige
 * algum e-mail único pra criar a conta, então é gerado um placeholder (`DOMINIO_EMAIL_PENDENTE`)
 * — o acesso do cliente continua funcionando normalmente pelo código via WhatsApp (que usa
 * telefone, não e-mail); só assinatura eletrônica de contrato depende de um e-mail de verdade. */
export async function criarCliente(dados: NovoClienteInput): Promise<Cliente> {
  const supabase = createAdminClient();

  const cpfNormalizado = dados.cpf.replace(/\D/g, "");
  const { data: cpfExistente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("cpf_cnpj", cpfNormalizado)
    .maybeSingle();
  if (cpfExistente) throw new Error("Já existe um cliente cadastrado com esse CPF.");

  const emailInformado = dados.email.trim();
  const emailFinal = emailInformado || `sememail.${cpfNormalizado}@${DOMINIO_EMAIL_PENDENTE}`;

  const { data: emailExistente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", emailFinal.toLowerCase())
    .maybeSingle();
  if (emailExistente) throw new Error("Já existe uma conta cadastrada com esse e-mail.");

  const usuarioId = await convidarUsuario(supabase, {
    email: emailFinal,
    nome: dados.nomeCompleto,
    telefone: dados.telefone,
    cpfCnpj: cpfNormalizado,
    perfil: "cliente",
  });

  const agora = new Date().toISOString();
  const { data: clienteRow, error: clienteError } = await supabase
    .from("clientes")
    .insert({
      usuario_id: usuarioId,
      nome: dados.nomeCompleto,
      tipo_documento: "cpf",
      documento: cpfNormalizado,
      rg: dados.rg,
      nacionalidade: dados.nacionalidade,
      profissao: dados.profissao,
      data_nascimento: dados.dataNascimento,
      cnh_numero: dados.cnhNumero,
      cnh_validade: dados.cnhValidade || null,
      endereco_logradouro: dados.endereco,
      endereco_numero: dados.numero,
      endereco_complemento: dados.complemento ?? null,
      endereco_bairro: dados.bairro,
      endereco_cidade: dados.cidade,
      endereco_estado: dados.uf,
      endereco_cep: dados.cep,
      banco: "",
      agencia: "",
      conta: "",
      chave_pix: "",
      cliente_desde: agora,
    })
    .select()
    .single();
  if (clienteError || !clienteRow) {
    // Não deixa órfão no Auth se a linha de cliente não puder ser criada.
    await supabase.auth.admin.deleteUser(usuarioId);
    throw new Error(clienteError?.message ?? "Não foi possível cadastrar o cliente.");
  }

  const scorePontuacao = 500;
  const { error: scoreError } = await supabase.from("scores").insert({
    cliente_id: clienteRow.id,
    pontuacao: scorePontuacao,
    categoria: categoriaPorPontuacao(scorePontuacao),
    pontualidade_pagamentos: 100,
    quantidade_atrasos: 0,
    tempo_como_cliente_meses: 0,
    conservacao_veiculo: 100,
    quantidade_contratos: 0,
    quantidade_ocorrencias: 0,
  });
  if (scoreError) throw new Error(scoreError.message);

  const { data: scoreRow } = await supabase
    .from("scores")
    .select("id")
    .eq("cliente_id", clienteRow.id)
    .single();
  if (scoreRow) {
    await supabase
      .from("historico_score")
      .insert({ score_id: scoreRow.id, data: agora, pontuacao: scorePontuacao });
  }

  if (dados.anexos.length > 0) {
    await supabase.from("documentos").insert(
      dados.anexos.map((arquivo) => ({
        cliente_id: clienteRow.id,
        categoria: "cadastro",
        nome: arquivo.name,
        url: "#",
        tamanho_kb: Math.max(1, Math.round(arquivo.size / 1024)),
        criado_em: agora,
      }))
    );
  }

  return mapCliente(clienteRow);
}
