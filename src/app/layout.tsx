import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth/auth-context";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Usado pra resolver URLs relativas de imagem nas meta tags (og:image etc.).
  metadataBase: new URL("https://www.zerotrezetransportes.com.br"),
  title: {
    default: "Zero Treze Transportes",
    template: "%s | Zero Treze Transportes",
  },
  description:
    "Portal do Locatário e Backoffice da Zero Treze Transportes — administre sua locação de veículos em um só lugar.",
};

export const viewport: Viewport = {
  themeColor: "#171208",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full scroll-smooth antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* "dark" mapeia pra uma classe própria (mesmo não tendo nenhuma regra de CSS pra ela) —
        de propósito, nunca string vazia: o next-themes faz `classList.remove(...valores)` ao
        trocar de tema, e o navegador lança exceção se algum valor for "" (quebrava a hidratação
        da página inteira). O tema escuro já é o :root padrão, então uma classe "dark" inerte não
        muda nada visualmente. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          value={{ light: "light", dark: "dark" }}
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
