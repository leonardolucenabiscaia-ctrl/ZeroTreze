import type {
  Acordo,
  Avaliacao,
  Chamado,
  Cliente,
  Contrato,
  Documento,
  LogAuditoria,
  Mensagem,
  MovimentoExtrato,
  Multa,
  Notificacao,
  NotificacaoCobranca,
  Parcela,
  ParcelaAcordo,
  ParametrosFinanceiros,
  RegraCobranca,
  ScoreLocatario,
  SolicitacaoAssistencia,
  Usuario,
  Veiculo,
} from "@/lib/types";

/** Conversores entre linhas do Supabase (snake_case) e os tipos do app (camelCase). Crescendo
 * conforme cada módulo é migrado (M2/M3). */

export function mapUsuario(row: Record<string, unknown>): Usuario {
  return {
    id: row.id as string,
    nome: row.nome as string,
    email: row.email as string,
    telefone: row.telefone as string,
    cpfCnpj: row.cpf_cnpj as string,
    perfil: row.perfil as Usuario["perfil"],
    fotoUrl: (row.foto_url as string | null) ?? undefined,
    preferenciasNotificacao: row.preferencias_notificacao as Usuario["preferenciasNotificacao"],
    criadoEm: row.criado_em as string,
  };
}

export function mapCliente(row: Record<string, unknown>): Cliente {
  return {
    id: row.id as string,
    usuarioId: row.usuario_id as string,
    nome: row.nome as string,
    tipoDocumento: row.tipo_documento as Cliente["tipoDocumento"],
    documento: row.documento as string,
    rg: row.rg as string,
    nacionalidade: row.nacionalidade as string,
    profissao: row.profissao as string,
    dataNascimento: row.data_nascimento as string,
    cnh: {
      numero: row.cnh_numero as string,
      validade: row.cnh_validade as string,
    },
    endereco: {
      logradouro: row.endereco_logradouro as string,
      numero: row.endereco_numero as string,
      complemento: (row.endereco_complemento as string | null) ?? undefined,
      bairro: row.endereco_bairro as string,
      cidade: row.endereco_cidade as string,
      estado: row.endereco_estado as string,
      cep: row.endereco_cep as string,
    },
    dadosBancarios: {
      banco: row.banco as string,
      agencia: row.agencia as string,
      conta: row.conta as string,
      chavePix: row.chave_pix as string,
    },
    clienteDesde: row.cliente_desde as string,
  };
}

export function mapVeiculo(
  row: Record<string, unknown>,
  historico: Record<string, unknown>[] = []
): Veiculo {
  return {
    id: row.id as string,
    modelo: row.modelo as string,
    marca: row.marca as string,
    ano: row.ano as number,
    cor: row.cor as string,
    placa: row.placa as string,
    renavam: row.renavam as string,
    chassi: row.chassi as string,
    categoria: row.categoria as string,
    combustivel: row.combustivel as string,
    quilometragem: row.quilometragem as number,
    fotoUrl: (row.foto_url as string | null) ?? "",
    proximaRevisao: row.proxima_revisao as string,
    ultimaRevisao: row.ultima_revisao as string,
    seguradora: row.seguradora as string,
    numeroApolice: row.numero_apolice as string,
    assistencia247: row.assistencia_247 as boolean,
    garantiaAte: row.garantia_ate as string,
    bloqueado: row.bloqueado as boolean,
    bloqueadoEm: (row.bloqueado_em as string | null) ?? undefined,
    manutencaoTipo: (row.manutencao_tipo as "mecanica" | "funilaria" | null) ?? undefined,
    manutencaoDesde: (row.manutencao_desde as string | null) ?? undefined,
    indisponivel: (row.indisponivel as boolean | null) ?? false,
    indisponivelDesde: (row.indisponivel_desde as string | null) ?? undefined,
    historicoManutencao: historico.map((h) => ({
      id: h.id as string,
      data: h.data as string,
      km: h.km as number,
      descricao: h.descricao as string,
      oficina: h.oficina as string,
    })),
  };
}

export function mapContrato(
  row: Record<string, unknown>,
  aditivos: Record<string, unknown>[] = []
): Contrato {
  return {
    id: row.id as string,
    numero: row.numero as string,
    clienteId: row.cliente_id as string,
    veiculoId: row.veiculo_id as string,
    status: row.status as Contrato["status"],
    dataInicio: row.data_inicio as string,
    dataFim: row.data_fim as string,
    valorParcela: row.valor_parcela as number,
    valorCaucao: row.valor_caucao as number,
    limiteRenovacao: row.limite_renovacao as number,
    arquivoUrl: (row.arquivo_url as string | null) ?? "",
    aditivos: aditivos.map((a) => ({
      id: a.id as string,
      tipo: a.tipo as "aditivo" | "renovacao",
      descricao: a.descricao as string,
      data: a.data as string,
      arquivoUrl: (a.arquivo_url as string | null) ?? "",
    })),
    assinatura: row.assinatura_document_key
      ? {
          status: row.assinatura_status as string,
          requestId: row.assinatura_request_id as number,
          documentKey: row.assinatura_document_key as string,
          signingKey: row.assinatura_signing_key as string,
          enviadoEm: row.assinatura_enviado_em as string,
          atualizadoEm: (row.assinatura_atualizado_em as string | null) ?? undefined,
        }
      : undefined,
  };
}

export function mapParcela(row: Record<string, unknown>): Parcela {
  return {
    id: row.id as string,
    contratoId: row.contrato_id as string,
    numero: row.numero as number,
    competencia: row.competencia as string,
    valorOriginal: row.valor_original as number,
    dataVencimento: row.data_vencimento as string,
    dataPagamento: (row.data_pagamento as string | null) ?? undefined,
    status: row.status as Parcela["status"],
    formaPagamento: (row.forma_pagamento as Parcela["formaPagamento"] | null) ?? undefined,
    dataEnvioComprovante: (row.data_envio_comprovante as string | null) ?? undefined,
    acordoId: (row.acordo_id as string | null) ?? undefined,
    desconto:
      row.desconto_multa || row.desconto_percentual || row.desconto_valor_fixo
        ? {
            descontarMulta: (row.desconto_multa as boolean | null) ?? false,
            percentual: (row.desconto_percentual as number | null) ?? undefined,
            valorFixo: (row.desconto_valor_fixo as number | null) ?? undefined,
            aplicadoPorNome: row.desconto_aplicado_por_nome as string,
            aplicadoEm: row.desconto_aplicado_em as string,
            motivo: (row.desconto_motivo as string | null) ?? undefined,
          }
        : undefined,
    baixaManual: row.baixa_manual_em
      ? {
          valor: row.baixa_manual_valor as number,
          aplicadoPorNome: row.baixa_manual_por_nome as string,
          aplicadoEm: row.baixa_manual_em as string,
          motivo: row.baixa_manual_motivo as string,
        }
      : undefined,
  };
}

export function mapMovimentoExtrato(row: Record<string, unknown>): MovimentoExtrato {
  return {
    id: row.id as string,
    contratoId: row.contrato_id as string,
    descricao: row.descricao as string,
    data: row.data as string,
    tipo: row.tipo as MovimentoExtrato["tipo"],
    valor: row.valor as number,
    saldo: row.saldo as number,
  };
}

export function mapParametrosFinanceiros(row: Record<string, unknown>): ParametrosFinanceiros {
  return {
    percentualMulta: row.percentual_multa as number,
    jurosMoraDiarioReais: row.juros_mora_diario_reais as number,
    indiceCorrecaoMensal: row.indice_correcao_mensal as number,
  };
}

export function mapDocumento(row: Record<string, unknown>): Documento {
  return {
    id: row.id as string,
    clienteId: (row.cliente_id as string | null) ?? undefined,
    contratoId: (row.contrato_id as string | null) ?? undefined,
    veiculoId: (row.veiculo_id as string | null) ?? undefined,
    parcelaId: (row.parcela_id as string | null) ?? undefined,
    parcelaAcordoId: (row.parcela_acordo_id as string | null) ?? undefined,
    acordoId: (row.acordo_id as string | null) ?? undefined,
    categoria: row.categoria as Documento["categoria"],
    nome: row.nome as string,
    url: row.url as string,
    tamanhoKb: row.tamanho_kb as number,
    criadoEm: row.criado_em as string,
  };
}

export function mapMulta(row: Record<string, unknown>): Multa {
  return {
    id: row.id as string,
    contratoId: row.contrato_id as string,
    numeroAuto: row.numero_auto as string,
    orgao: row.orgao as string,
    data: row.data as string,
    descricao: row.descricao as string,
    valor: row.valor as number,
    vencimento: row.vencimento as string,
    situacao: row.situacao as Multa["situacao"],
    pontos: row.pontos as number,
    dataRegistro: row.data_registro as string,
    anexoUrl: (row.anexo_url as string | null) ?? undefined,
    cienciaEm: (row.ciencia_em as string | null) ?? undefined,
  };
}

export function mapParcelaAcordo(row: Record<string, unknown>): ParcelaAcordo {
  return {
    id: row.id as string,
    acordoId: row.acordo_id as string,
    numero: row.numero as number,
    valor: row.valor as number,
    vencimento: row.vencimento as string,
    status: row.status as ParcelaAcordo["status"],
    formaPagamento: (row.forma_pagamento as ParcelaAcordo["formaPagamento"] | null) ?? undefined,
    dataEnvioComprovante: (row.data_envio_comprovante as string | null) ?? undefined,
    dataPagamento: (row.data_pagamento as string | null) ?? undefined,
  };
}

export function mapAcordo(
  row: Record<string, unknown>,
  cronograma: Record<string, unknown>[] = []
): Acordo {
  return {
    id: row.id as string,
    numero: row.numero as string,
    clienteId: row.cliente_id as string,
    contratoId: row.contrato_id as string,
    valorTotal: row.valor_total as number,
    valorEntrada: row.valor_entrada as number,
    valorDividaOriginal: (row.valor_divida_original as number | null) ?? undefined,
    periodicidade: row.periodicidade as Acordo["periodicidade"],
    situacao: row.situacao as Acordo["situacao"],
    cronograma: cronograma
      .sort((a, b) => (a.numero as number) - (b.numero as number))
      .map(mapParcelaAcordo),
    descricao: (row.descricao as string | null) ?? undefined,
    criadoEm: row.criado_em as string,
  };
}

export function mapMensagem(row: Record<string, unknown>): Mensagem {
  return {
    id: row.id as string,
    chamadoId: row.chamado_id as string,
    autorId: row.autor_id as string,
    autorNome: row.autor_nome as string,
    autorPerfil: row.autor_perfil as Mensagem["autorPerfil"],
    texto: (row.texto as string | null) ?? undefined,
    anexo:
      row.anexo_url || row.anexo_nome
        ? {
            id: row.id as string,
            tipo: row.anexo_tipo as NonNullable<Mensagem["anexo"]>["tipo"],
            nome: row.anexo_nome as string,
            url: row.anexo_url as string,
          }
        : undefined,
    enviadaEm: row.enviada_em as string,
    status: row.status as Mensagem["status"],
  };
}

export function mapChamado(
  row: Record<string, unknown>,
  mensagens: Record<string, unknown>[] = [],
  avaliacaoId?: string
): Chamado {
  return {
    id: row.id as string,
    numero: row.numero as string,
    clienteId: row.cliente_id as string,
    contratoId: (row.contrato_id as string | null) ?? undefined,
    categoria: row.categoria as Chamado["categoria"],
    titulo: row.titulo as string,
    status: row.status as Chamado["status"],
    prioridade: row.prioridade as Chamado["prioridade"],
    criadoEm: row.criado_em as string,
    atualizadoEm: row.atualizado_em as string,
    mensagens: mensagens
      .sort((a, b) => new Date(a.enviada_em as string).getTime() - new Date(b.enviada_em as string).getTime())
      .map(mapMensagem),
    avaliacaoId,
  };
}

export function mapNotificacao(row: Record<string, unknown>): Notificacao {
  return {
    id: row.id as string,
    usuarioId: row.usuario_id as string,
    tipo: row.tipo as Notificacao["tipo"],
    titulo: row.titulo as string,
    mensagem: row.mensagem as string,
    lida: row.lida as boolean,
    criadoEm: row.criado_em as string,
    link: (row.link as string | null) ?? undefined,
  };
}

export function mapLogAuditoria(row: Record<string, unknown>): LogAuditoria {
  return {
    id: row.id as string,
    usuarioId: row.usuario_id as string,
    usuarioNome: row.usuario_nome as string,
    acao: row.acao as string,
    entidade: row.entidade as string,
    entidadeId: row.entidade_id as string,
    criadoEm: row.criado_em as string,
  };
}

export function mapScore(
  row: Record<string, unknown>,
  historico: Record<string, unknown>[] = []
): ScoreLocatario {
  return {
    id: row.id as string,
    clienteId: row.cliente_id as string,
    pontuacao: row.pontuacao as number,
    categoria: row.categoria as ScoreLocatario["categoria"],
    pontualidadePagamentos: row.pontualidade_pagamentos as number,
    quantidadeAtrasos: row.quantidade_atrasos as number,
    tempoComoClienteMeses: row.tempo_como_cliente_meses as number,
    conservacaoVeiculo: row.conservacao_veiculo as number,
    quantidadeContratos: row.quantidade_contratos as number,
    quantidadeOcorrencias: row.quantidade_ocorrencias as number,
    historico: historico
      .sort((a, b) => new Date(a.data as string).getTime() - new Date(b.data as string).getTime())
      .map((h) => ({ data: h.data as string, pontuacao: h.pontuacao as number })),
  };
}

export function mapRegraCobranca(row: Record<string, unknown>): RegraCobranca {
  return {
    id: row.id as string,
    offsetDias: row.offset_dias as number,
    canais: row.canais as RegraCobranca["canais"],
    mensagem: row.mensagem as string,
    ativa: row.ativa as boolean,
  };
}

export function mapNotificacaoCobranca(row: Record<string, unknown>): NotificacaoCobranca {
  return {
    id: row.id as string,
    titulo: row.titulo as string,
    descricao: row.descricao as string,
    canais: row.canais as NotificacaoCobranca["canais"],
    destinatario: row.destinatario as NotificacaoCobranca["destinatario"],
    clienteId: (row.cliente_id as string | null) ?? undefined,
    clienteNome: (row.cliente_nome as string | null) ?? undefined,
    clientesAlcancados: row.clientes_alcancados as number,
    enviadoPorNome: row.enviado_por_nome as string,
    enviadoEm: row.enviado_em as string,
  };
}

export function mapAvaliacao(row: Record<string, unknown>): Avaliacao {
  return {
    id: row.id as string,
    chamadoId: row.chamado_id as string,
    clienteId: row.cliente_id as string,
    notaAtendimento: row.nota_atendimento as number,
    notaTempo: row.nota_tempo as number,
    notaQualidade: row.nota_qualidade as number,
    notaEducacao: row.nota_educacao as number,
    notaResolucao: row.nota_resolucao as number,
    comentario: (row.comentario as string | null) ?? undefined,
    criadaEm: row.criada_em as string,
  };
}

export function mapSolicitacaoAssistencia(row: Record<string, unknown>): SolicitacaoAssistencia {
  return {
    id: row.id as string,
    protocolo: row.protocolo as string,
    clienteId: row.cliente_id as string,
    contratoId: row.contrato_id as string,
    tipo: row.tipo as SolicitacaoAssistencia["tipo"],
    status: row.status as SolicitacaoAssistencia["status"],
    latitude: (row.latitude as number | null) ?? undefined,
    longitude: (row.longitude as number | null) ?? undefined,
    tempoEstimadoMin: row.tempo_estimado_min as number,
    criadoEm: row.criado_em as string,
  };
}
