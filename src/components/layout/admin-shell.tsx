"use client";

import { AdminOnlyGuard } from "@/lib/auth/route-guards";
import { useAuth } from "@/lib/auth/auth-context";
import { podeAcessar } from "@/lib/auth/permissions";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Topbar } from "./topbar";
import { PageTransition } from "./page-transition";
import { AssistenciaAlert } from "./assistencia-alert";
import { ADMIN_NAV_ITEMS, ADMIN_NAV_MOBILE } from "./nav-items";

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const itensPermitidos = ADMIN_NAV_ITEMS.filter(
    (item) => !item.recurso || (usuario && podeAcessar(usuario.perfil, item.recurso))
  );
  const itensMobile = ADMIN_NAV_MOBILE.filter(
    (item) => !item.recurso || (usuario && podeAcessar(usuario.perfil, item.recurso))
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {usuario && podeAcessar(usuario.perfil, "assistencia") && <AssistenciaAlert />}
      <Sidebar items={itensPermitidos} title="Backoffice" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar perfilHref="/admin/configuracoes" notificacoesHref="/admin/notificacoes" />
        <main className="flex-1 px-4 pb-24 pt-4 lg:px-6 lg:pb-6 lg:pt-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <BottomNav items={itensMobile} menuItems={itensPermitidos} />
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminOnlyGuard>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminOnlyGuard>
  );
}
