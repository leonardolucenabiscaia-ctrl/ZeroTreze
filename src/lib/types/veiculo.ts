export interface HistoricoManutencao {
  id: string;
  data: string;
  km: number;
  descricao: string;
  oficina: string;
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
}
