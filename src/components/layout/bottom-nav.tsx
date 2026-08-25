"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { NavItem } from "./nav-items";

export function BottomNav({ items, menuItems }: { items: NavItem[]; menuItems?: NavItem[] }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = React.useState(false);

  const estaNosFixos = items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const menuAtivo = !estaNosFixos && (menuItems ?? []).some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-sidebar-border bg-sidebar/95 backdrop-blur lg:hidden">
        {items.map((item) => {
          const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
                ativo ? "text-gold" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        {menuItems && menuItems.length > 0 && (
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
              menuAtivo ? "text-gold" : "text-muted-foreground"
            )}
          >
            <Menu className="size-5" />
            Mais opções
          </button>
        )}
      </nav>

      {menuItems && menuItems.length > 0 && (
        <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
          <SheetContent side="bottom" className="lg:hidden">
            <SheetHeader>
              <SheetTitle>Mais opções</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-3 pb-2">
              {menuItems.map((item) => {
                const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuAberto(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg py-3 text-center text-[11px] font-medium",
                      ativo ? "bg-gold-muted text-gold" : "text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
