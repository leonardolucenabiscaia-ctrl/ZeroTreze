export type ProvedorSocial = "google" | "apple";

export interface SocialAuthProvider {
  autenticar(provedor: ProvedorSocial): Promise<{ email: string }>;
}

// TODO(integração real): substituir pelo fluxo OAuth real de cada provedor
// (Google Identity Services / Sign in with Apple), mantendo a interface SocialAuthProvider.
const mockSocialAuthProvider: SocialAuthProvider = {
  async autenticar() {
    // Em produção isso viria do retorno do OAuth (id_token/e-mail verificado).
    // Aqui simulamos o provedor devolvendo o e-mail da conta demo do cliente.
    return { email: "amanda@exemplo.com" };
  },
};

export const socialAuthProvider: SocialAuthProvider = mockSocialAuthProvider;
