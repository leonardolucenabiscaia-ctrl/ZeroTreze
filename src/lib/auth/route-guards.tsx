"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { PerfilUsuario } from "@/lib/types";
import { useAuth } from "./auth-context";

function TelaCarregando() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
}

export function RoleGuard({
  perfisPermitidos,
  redirecionarPara,
  children,
}: {
  perfisPermitidos: PerfilUsuario[];
  redirecionarPara: string;
  children: React.ReactNode;
}) {
  const { usuario, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;
    if (!usuario) {
      router.replace("/login");
      return;
    }
    if (!perfisPermitidos.includes(usuario.perfil)) {
      router.replace(redirecionarPara);
    }
  }, [isLoading, usuario, perfisPermitidos, redirecionarPara, router]);

  if (isLoading || !usuario || !perfisPermitidos.includes(usuario.perfil)) {
    return <TelaCarregando />;
  }

  return <>{children}</>;
}

export function ClientOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard perfisPermitidos={["cliente"]} redirecionarPara="/admin/dashboard">
      {children}
    </RoleGuard>
  );
}

export function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      perfisPermitidos={["operador", "gestor", "administrador"]}
      redirecionarPara="/dashboard"
    >
      {children}
    </RoleGuard>
  );
}
