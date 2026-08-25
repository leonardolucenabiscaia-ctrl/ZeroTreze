"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface OpcaoSelectBusca {
  value: string;
  label: string;
}

interface SelectBuscaProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: OpcaoSelectBusca[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

/** Como um `Select`, mas o primeiro elemento do conteúdo é sempre um campo de busca — filtra as
 * opções por texto (via `cmdk`) antes de selecionar. Usado nos filtros de lista do app (a busca
 * ajuda quando a lista de opções vem de dados reais e pode crescer bastante, tipo clientes ou
 * veículos). */
export function SelectBusca({
  value,
  onValueChange,
  options,
  placeholder = "Selecione…",
  searchPlaceholder = "Buscar…",
  emptyText = "Nenhuma opção encontrada.",
  className,
  disabled,
}: SelectBuscaProps) {
  const [open, setOpen] = React.useState(false);
  const selecionado = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate", !selecionado && "text-muted-foreground")}>
            {selecionado ? selecionado.label : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[12rem] p-0" align="start">
        <CommandPrimitive shouldFilter className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              autoFocus
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandPrimitive.List className="max-h-64 overflow-y-auto p-1">
            <CommandPrimitive.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </CommandPrimitive.Empty>
            {options.map((opcao) => (
              <CommandPrimitive.Item
                key={opcao.value}
                value={opcao.label}
                onSelect={() => {
                  onValueChange(opcao.value);
                  setOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-sm text-foreground data-[selected=true]:bg-accent"
              >
                <span className="absolute left-2 flex size-4 items-center justify-center">
                  {opcao.value === value && <Check className="size-4 text-gold" />}
                </span>
                <span className="truncate">{opcao.label}</span>
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
