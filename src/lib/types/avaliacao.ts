export interface Avaliacao {
  id: string;
  chamadoId: string;
  clienteId: string;
  notaAtendimento: number;
  notaTempo: number;
  notaQualidade: number;
  notaEducacao: number;
  notaResolucao: number;
  comentario?: string;
  criadaEm: string;
}
