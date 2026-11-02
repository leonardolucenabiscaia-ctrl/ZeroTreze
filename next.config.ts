import type { NextConfig } from "next";

// Origem do próprio projeto Supabase — usada no CSP (connect-src, pra permitir os fetches do
// supabase-js; img-src, pra permitir as fotos de veículo, que ficam num bucket público do
// Storage). NEXT_PUBLIC_* já é exposta ao browser por design, não é segredo.
const origemSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";

// Headers de segurança que faltavam por completo (nenhum dos 5 era configurado antes). CSP
// aqui é deliberadamente pragmático (permite 'unsafe-inline'/'unsafe-eval' em script-src) —
// o objetivo nesta rodada é fechar o que está em branco hoje (clickjacking via iframe, MIME
// sniffing, embutir scripts/objetos de outra origem) sem arriscar quebrar o hydration do Next
// App Router, que depende de scripts inline. Migrar pra uma CSP com nonce (mais estrita) é uma
// melhoria futura, não incluída aqui.
const headersDeSeguranca = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      `img-src 'self' data: blob:${origemSupabase ? ` ${origemSupabase}` : ""}`,
      `connect-src 'self'${origemSupabase ? ` ${origemSupabase}` : ""}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
  async headers() {
    return [{ source: "/:path*", headers: headersDeSeguranca }];
  },
};

export default nextConfig;
