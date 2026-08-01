export type PerfilUsuario = "cliente" | "operador" | "gestor" | "administrador";

export type CanalNotificacao = "sms" | "whatsapp" | "email" | "push";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpfCnpj: string;
  perfil: PerfilUsuario;
  fotoUrl?: string;
  preferenciasNotificacao: Record<CanalNotificacao, boolean>;
  criadoEm: string;
}
