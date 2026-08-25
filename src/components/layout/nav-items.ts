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
  CircleSlash,
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

function porHref(items: NavItem[], href: string): NavItem {
  const item = items.find((i) => i.href === href);
  if (!item) throw new Error(`Item de navegação não encontrado: ${href}`);
  return item;
}

// Só os mais usados ficam fixos na barra — o resto (Extrato, Contratos, Veículo, Multas,
// Notificações, Acordos, Assistência 24h, Documentos, Score) aparece na aba "Mais opções".
export const CLIENT_NAV_MOBILE: NavItem[] = [
  porHref(CLIENT_NAV_ITEMS, "/dashboard"),
  porHref(CLIENT_NAV_ITEMS, "/financeiro"),
  porHref(CLIENT_NAV_ITEMS, "/atendimento"),
  porHref(CLIENT_NAV_ITEMS, "/perfil"),
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
  {
    href: "/admin/veiculos-indisponiveis",
    label: "Veículos indisponíveis",
    icon: CircleSlash,
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

// Só os mais usados ficam fixos na barra — o resto aparece na aba "Mais opções". Busca por href
// (não por índice) de propósito: índice fixo já quebrou antes ao inserir um item no meio da lista.
export const ADMIN_NAV_MOBILE: NavItem[] = [
  porHref(ADMIN_NAV_ITEMS, "/admin/dashboard"),
  porHref(ADMIN_NAV_ITEMS, "/admin/clientes"),
  porHref(ADMIN_NAV_ITEMS, "/admin/contratos"),
  porHref(ADMIN_NAV_ITEMS, "/admin/financeiro"),
];
