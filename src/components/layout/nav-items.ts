import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileText,
  Car,
  AlertTriangle,
  Bell,
  Handshake,
  Headset,
  Siren,
  FolderOpen,
  User,
  Award,
  Users,
  ShieldCheck,
  BarChart3,
  Settings,
  ClipboardList,
  Lock,
  Wrench,
  Tv,
} from "lucide-react";

import type { RecursoAdmin } from "@/lib/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  recurso?: RecursoAdmin;
}

export const CLIENT_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/extrato", label: "Extrato", icon: Receipt },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/veiculo", label: "Veículo", icon: Car },
  { href: "/multas", label: "Multas", icon: AlertTriangle },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/acordos", label: "Acordos", icon: Handshake },
  { href: "/atendimento", label: "Atendimento", icon: Headset },
  { href: "/assistencia-24h", label: "Assistência 24h", icon: Siren },
  { href: "/documentos", label: "Documentos", icon: FolderOpen },
  { href: "/score", label: "Score", icon: Award },
  { href: "/perfil", label: "Perfil", icon: User },
];

export const CLIENT_NAV_MOBILE: NavItem[] = [
  CLIENT_NAV_ITEMS[0],
  CLIENT_NAV_ITEMS[1],
  CLIENT_NAV_ITEMS[8],
  CLIENT_NAV_ITEMS[6],
  CLIENT_NAV_ITEMS[12],
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, recurso: "dashboard" },
  { href: "/admin/clientes", label: "Clientes", icon: Users, recurso: "clientes" },
  { href: "/admin/contratos", label: "Contratos", icon: FileText, recurso: "contratos" },
  { href: "/admin/veiculos", label: "Veículos", icon: Car, recurso: "veiculos" },
  {
    href: "/admin/veiculos-bloqueados",
    label: "Veículos bloqueados",
    icon: Lock,
    recurso: "veiculos",
  },
  { href: "/admin/manutencao", label: "Manutenção", icon: Wrench, recurso: "veiculos" },
  { href: "/admin/dashboard-tv", label: "Dashboard de TV", icon: Tv, recurso: "veiculos" },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, recurso: "financeiro" },
  { href: "/admin/cobranca", label: "Cobrança", icon: Receipt, recurso: "cobranca" },
  { href: "/admin/acordos", label: "Acordos", icon: Handshake, recurso: "acordos" },
  { href: "/admin/notificacoes", label: "Notificações", icon: Bell, recurso: "notificacoes" },
  { href: "/admin/chamados", label: "Chamados", icon: Headset, recurso: "chamados" },
  { href: "/admin/assistencia", label: "Assistência", icon: Siren, recurso: "assistencia" },
  { href: "/admin/multas", label: "Multas", icon: AlertTriangle, recurso: "multas" },
  { href: "/admin/documentos", label: "Documentos", icon: FolderOpen, recurso: "documentos" },
  { href: "/admin/usuarios", label: "Usuários", icon: Users, recurso: "usuarios" },
  { href: "/admin/permissoes", label: "Permissões", icon: ShieldCheck, recurso: "permissoes" },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3, recurso: "relatorios" },
  { href: "/admin/auditoria", label: "Auditoria", icon: ClipboardList, recurso: "auditoria" },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, recurso: "configuracoes" },
];

export const ADMIN_NAV_MOBILE: NavItem[] = [
  ADMIN_NAV_ITEMS[0], // Dashboard
  ADMIN_NAV_ITEMS[1], // Clientes
  ADMIN_NAV_ITEMS[2], // Contratos
  ADMIN_NAV_ITEMS[5], // Financeiro
  ADMIN_NAV_ITEMS[9], // Chamados
];
