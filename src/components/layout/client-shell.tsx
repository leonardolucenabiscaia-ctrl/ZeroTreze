"use client";

import { ClientOnlyGuard } from "@/lib/auth/route-guards";
import { MultaCienciaGate } from "./multa-ciencia-gate";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Topbar } from "./topbar";
import { PageTransition } from "./page-transition";
import { CLIENT_NAV_ITEMS, CLIENT_NAV_MOBILE } from "./nav-items";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnlyGuard>
      <MultaCienciaGate>
        <div className="flex min-h-dvh bg-background">
          <Sidebar items={CLIENT_NAV_ITEMS} title="Portal do Locatário" />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar perfilHref="/perfil" notificacoesHref="/notificacoes" />
            <main className="flex-1 px-4 pb-24 pt-4 lg:px-6 lg:pb-6 lg:pt-6">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
          <BottomNav items={CLIENT_NAV_MOBILE} />
        </div>
      </MultaCienciaGate>
    </ClientOnlyGuard>
  );
}
