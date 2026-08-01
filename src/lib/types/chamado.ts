export type CategoriaChamado =
  | "financeiro"
  | "manutencao"
  | "documentacao"
  | "acidente"
  | "troca_veiculo"
  | "duvidas";

export type StatusChamado = "aberto" | "em_andamento" | "aguardando_cliente" | "resolvido" | "encerrado";

export type PrioridadeChamado = "baixa" | "media" | "alta" | "urgente";

export type TipoAnexo = "imagem" | "video" | "documento" | "audio" | "localizacao";

export interface Anexo {
  id: string;
  tipo: TipoAnexo;
  nome: string;
  url: string;
}

export type StatusMensagem = "enviada" | "entregue" | "lida";

export interface Mensagem {
  id: string;
  chamadoId: string;
  autorId: string;
  autorNome: string;
  autorPerfil: "cliente" | "operador" | "gestor" | "administrador";
  texto?: string;
  anexo?: Anexo;
  enviadaEm: string;
  status: StatusMensagem;
}

export interface Chamado {
  id: string;
  numero: string;
  clienteId: string;
  contratoId?: string;
  categoria: CategoriaChamado;
  titulo: string;
  status: StatusChamado;
  prioridade: PrioridadeChamado;
  criadoEm: string;
  atualizadoEm: string;
  mensagens: Mensagem[];
  avaliacaoId?: string;
}
