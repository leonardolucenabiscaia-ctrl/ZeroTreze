"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils/cn";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        // O Radix Dialog põe `pointer-events: none` no <body> enquanto está aberto (só
        // reabilita nos próprios elementos dele) — um Popover aberto de dentro de um Dialog
        // herda esse `none`, então o menu aparece mas nenhum clique nele funciona. Reforça
        // `auto` direto no elemento pra esse caso continuar funcionando.
        style={{ pointerEvents: "auto" }}
        className={cn(
          "z-50 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/40 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
