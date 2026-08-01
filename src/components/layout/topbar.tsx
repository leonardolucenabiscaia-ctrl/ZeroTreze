"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell, Search } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { listarNotificacoesPorUsuario } from "@/lib/services/notificacoes.service";
import { CLIENT_NAV_ITEMS, ADMIN_NAV_ITEMS } from "./nav-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GlobalSearch } from "@/components/shared/global-search";

function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// Telas de nível raiz (destinos diretos do menu) não mostram "voltar" — só as telas
// "internas" (detalhe, formulário de criação, etc.) mostram, como em um app nativo.
const HREFS_RAIZ = new Set(
  [...CLIENT_NAV_ITEMS, ...ADMIN_NAV_ITEMS].map((item) => item.href)
);

export function Topbar({
  perfilHref,
  notificacoesHref,
}: {
  perfilHref: string;
  notificacoesHref: string;
}) {
  const { usuario, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [naoLidas, setNaoLidas] = React.useState(0);
  const [buscaAberta, setBuscaAberta] = React.useState(false);

  React.useEffect(() => {
    if (!usuario) return;
    listarNotificacoesPorUsuario(usuario.id).then((notificacoes) =>
      setNaoLidas(notificacoes.filter((n) => !n.lida).length)
    );
  }, [usuario]);

  if (!usuario) return null;

  const mostrarVoltar = !HREFS_RAIZ.has(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {mostrarVoltar && (
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <button
          onClick={() => setBuscaAberta(true)}
          className="flex h-9 w-full max-w-sm shrink items-center gap-2 overflow-hidden rounded-lg border border-border bg-secondary/40 px-3 text-sm text-muted-foreground transition-colors hover:border-gold/30"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">
            <span className="sm:hidden">Buscar…</span>
            <span className="hidden sm:inline">Buscar contratos, veículos, documentos…</span>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={notificacoesHref}
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-5" />
          {naoLidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
            >
              {naoLidas}
            </Badge>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar>
              <AvatarImage src={usuario.fotoUrl} alt={usuario.nome} />
              <AvatarFallback>{iniciais(usuario.nome)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{usuario.nome}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={perfilHref}>Meu perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={logout}>
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <GlobalSearch open={buscaAberta} onOpenChange={setBuscaAberta} />
    </header>
  );
}
