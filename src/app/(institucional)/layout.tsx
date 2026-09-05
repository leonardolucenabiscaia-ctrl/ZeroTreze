import Link from "next/link";

// Página única — os itens (exceto "Acessar área do cliente") rolam até a seção correspondente
// em vez de navegar pra uma URL diferente.
const NAV_ITEMS = [
  { href: "/#inicio", label: "Início" },
  { href: "/#sobre-nos", label: "Sobre Nós" },
  { href: "/#clientes", label: "Clientes" },
  { href: "/#credenciamentos", label: "Credenciamentos" },
  { href: "/#contato", label: "Contato" },
];

export default function InstitucionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo estático */}
            <img src="/logo-zero-treze.webp" alt="Zero Treze Transportes" width={40} height={40} className="rounded-lg" />
            <span className="text-sm font-semibold tracking-wide text-foreground">
              <span className="text-gold">Z</span>ERO <span className="text-gold">T</span>REZE TRANSPORTES
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground transition-opacity hover:opacity-90"
            >
              Acessar área do cliente
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:px-6">
          <p className="font-medium text-foreground">Zero Treze Transportes</p>
          <p>© {new Date().getFullYear()} Zero Treze Transportes. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
