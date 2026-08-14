import type { MetadataRoute } from "next";

// Só a home institucional ("/") é pública de verdade — todo o resto (portal do
// cliente, backoffice, telas de login) exige autenticação (ver `proxy.ts`) e não
// deve ser indexado pelos buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/financeiro",
        "/contratos",
        "/veiculo",
        "/multas",
        "/notificacoes",
        "/acordos",
        "/atendimento",
        "/assistencia-24h",
        "/documentos",
        "/perfil",
        "/avaliacao",
        "/score",
        "/extrato",
        "/login",
        "/esqueci-senha",
        "/definir-senha",
        "/imprimir",
        "/api",
      ],
    },
  };
}
