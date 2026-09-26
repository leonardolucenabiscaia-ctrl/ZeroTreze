"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Card de alternância entre modo claro e escuro — reaproveitado no painel admin e no portal do
 * cliente. `theme` só fica definido depois que o next-themes monta no cliente (o servidor não
 * conhece a preferência salva no localStorage do navegador), então os botões só aparecem então. */
export function AparenciaCard() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Aparência</CardTitle>
        <CardDescription>Escolha entre o tema claro ou escuro.</CardDescription>
      </CardHeader>
      <CardContent>
        {theme === undefined ? (
          <Skeleton className="h-9 w-48" />
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
            >
              <Moon className="size-4" />
              Escuro
            </Button>
            <Button
              type="button"
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
            >
              <Sun className="size-4" />
              Claro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
