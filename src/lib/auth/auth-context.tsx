"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/services/api-client";
import type { Cliente, Usuario } from "@/lib/types";

interface PerfilResponse {
  usuario: Usuario;
  cliente: Cliente | null;
}

interface AuthContextValue {
  usuario: Usuario | null;
  cliente: Cliente | null;
  isLoading: boolean;
  login: (identificador: string, senha: string) => Promise<Usuario>;
  iniciarLoginPorCodigo: (destino: string) => Promise<{ email: string }>;
  confirmarLoginPorCodigo: (email: string, codigo: string) => Promise<Usuario>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/** `signInWithPassword`/`signInWithOtp` só aceitam e-mail — resolve CPF/CNPJ/e-mail digitado
 * pelo usuário para o e-mail real da conta (rota server-side, RLS nega tudo por padrão). */
async function resolverEmail(identificador: string): Promise<string> {
  const { email } = await apiFetch<{ email: string }>("/api/auth/resolver-email", {
    method: "POST",
    body: JSON.stringify({ identificador }),
  });
  return email;
}

async function buscarPerfilLogado(): Promise<PerfilResponse> {
  return apiFetch<PerfilResponse>("/api/auth/perfil");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = React.useState<Usuario | null>(null);
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let ativo = true;
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data }) => {
      if (!ativo) return;
      if (!data.user) {
        setIsLoading(false);
        return;
      }
      try {
        const perfil = await buscarPerfilLogado();
        if (!ativo) return;
        setUsuario(perfil.usuario);
        setCliente(perfil.cliente);
      } catch {
        // Sessão existe no Supabase mas o perfil não pôde ser carregado — trata como deslogado.
      } finally {
        if (ativo) setIsLoading(false);
      }
    });

    return () => {
      ativo = false;
    };
  }, []);

  const login = React.useCallback(async (identificador: string, senha: string) => {
    const email = await resolverEmail(identificador);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error("Credenciais inválidas. Verifique os dados informados.");
    const perfil = await buscarPerfilLogado();
    setUsuario(perfil.usuario);
    setCliente(perfil.cliente);
    return perfil.usuario;
  }, []);

  const iniciarLoginPorCodigo = React.useCallback(async (destino: string) => {
    const email = await resolverEmail(destino);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw new Error("Não foi possível enviar o código. Verifique os dados informados.");
    return { email };
  }, []);

  const confirmarLoginPorCodigo = React.useCallback(async (email: string, codigo: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
    if (error) throw new Error("Código inválido. Tente novamente.");
    const perfil = await buscarPerfilLogado();
    setUsuario(perfil.usuario);
    setCliente(perfil.cliente);
    return perfil.usuario;
  }, []);

  const logout = React.useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUsuario(null);
    setCliente(null);
  }, []);

  const value = React.useMemo(
    () => ({
      usuario,
      cliente,
      isLoading,
      login,
      iniciarLoginPorCodigo,
      confirmarLoginPorCodigo,
      logout,
    }),
    [usuario, cliente, isLoading, login, iniciarLoginPorCodigo, confirmarLoginPorCodigo, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
}
