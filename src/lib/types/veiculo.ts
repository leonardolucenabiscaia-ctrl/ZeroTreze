export interface HistoricoManutencao {
  id: string;
  data: string;
  km: number;
  descricao: string;
  oficina: string;
}

/** Catálogo crescente de itens de manutenção (ex.: "Pastilha de freio") — qualquer um da equipe
 * pode criar um tipo novo na hora de colocar um veículo em manutenção (ver
 * `colocarVeiculoEmManutencao`), disponível pra seleção nas próximas vezes. */
export interface TipoManutencao {
  id: string;
  nome: string;
  criadoPorNome?: string;
  criadoEm: string;
}

export interface Veiculo {
  id: string;
  modelo: string;
  marca: string;
  ano: number;
  cor: string;
  placa: string;
  renavam: string;
  chassi: string;
  categoria: string;
  combustivel: string;
  quilometragem: number;
  fotoUrl: string;
  proximaRevisao: string;
  ultimaRevisao: string;
  seguradora: string;
  numeroApolice: string;
  assistencia247: boolean;
  garantiaAte: string;
  historicoManutencao: HistoricoManutencao[];
  /** O contrato do veículo continua rodando normalmente enquanto bloqueado — só o carro fica
   * impedido de uso. Ver `bloquearVeiculo`/`desbloquearVeiculo` em `veiculos.service`. */
  bloqueado: boolean;
  bloqueadoEm?: string;
  /** Estado de manutenção — separado do bloqueio manual. Ver `colocarVeiculoEmManutencao`. */
  manutencaoTipo?: "mecanica" | "funilaria";
  manutencaoDesde?: string;
  /** Itens específicos selecionados nessa manutenção (ex.: ["Pastilha de freio", "Óleo"]) — nomes
   * do catálogo `TipoManutencao`, congelados no momento da seleção. */
  manutencaoItens?: string[];
  /** Pausa temporária decidida pela equipe (reservado, aguardando limpeza/documentação etc.) —
   * independente de bloqueio (geralmente por problema) e de manutenção. Ver
   * `marcarVeiculoIndisponivel`/`marcarVeiculoDisponivel` em `veiculos.service`. */
  indisponivel: boolean;
  indisponivelDesde?: string;
}
