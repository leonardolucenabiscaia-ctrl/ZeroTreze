"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Car, FileText, FolderOpen, Headset, Users } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { listarContratosPorCliente, listarContratos } from "@/lib/services/contratos.service";
import { listarVeiculos } from "@/lib/services/veiculos.service";
import { listarDocumentosPorCliente, listarDocumentos } from "@/lib/services/documentos.service";
import { listarChamadosPorCliente, listarChamados } from "@/lib/services/chamados.service";
import { listarClientes } from "@/lib/services/clientes.service";
import { formatDocument } from "@/lib/utils/formatters";
import type { Chamado, Cliente, Contrato, Documento, Veiculo } from "@/lib/types";

interface Resultados {
  clientes: Cliente[];
  contratos: Contrato[];
  veiculos: Veiculo[];
  documentos: Documento[];
  chamados: Chamado[];
}

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { usuario, cliente } = useAuth();
  const [termo, setTermo] = React.useState("");
  const [resultados, setResultados] = React.useState<Resultados>({
    clientes: [],
    contratos: [],
    veiculos: [],
    documentos: [],
    chamados: [],
  });

  React.useEffect(() => {
    if (!open || !usuario) return;

    async function carregar() {
      const isCliente = usuario!.perfil === "cliente";
      const [clientes, contratos, veiculos, documentos, chamados] = await Promise.all([
        isCliente ? Promise.resolve([]) : listarClientes(),
        isCliente && cliente ? listarContratosPorCliente(cliente.id) : listarContratos(),
        listarVeiculos(),
        isCliente && cliente ? listarDocumentosPorCliente(cliente.id) : listarDocumentos(),
        isCliente && cliente ? listarChamadosPorCliente(cliente.id) : listarChamados(),
      ]);
      setResultados({ clientes, contratos, veiculos, documentos, chamados });
    }
    carregar();
  }, [open, usuario, cliente]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const isCliente = usuario?.perfil === "cliente";
  const prefixo = isCliente ? "" : "/admin";

  function ir(href: string) {
    onOpenChange(false);
    setTermo("");
    router.push(href);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-24 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <Command
        shouldFilter
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          autoFocus
          value={termo}
          onValueChange={setTermo}
          placeholder={
            isCliente
              ? "Buscar contratos, veículos, documentos, chamados…"
              : "Buscar pessoas, contratos, veículos, documentos, chamados…"
          }
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-96 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhum resultado encontrado.
          </Command.Empty>

          {!isCliente && (
            <Command.Group heading="Pessoas" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {resultados.clientes.map((c) => (
                <Command.Item
                  key={c.id}
                  value={`${c.nome} ${c.documento}`}
                  onSelect={() => ir(`/admin/clientes/${c.id}`)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                >
                  <Users className="size-4 text-gold" />
                  {c.nome} — {formatDocument(c.documento)}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Contratos" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {resultados.contratos.map((c) => (
              <Command.Item
                key={c.id}
                value={c.numero}
                onSelect={() => ir(`${prefixo}/contratos/${c.id}`)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
              >
                <FileText className="size-4 text-gold" />
                Contrato {c.numero}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Veículos" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {resultados.veiculos.map((v) => (
              <Command.Item
                key={v.id}
                value={`${v.modelo} ${v.placa}`}
                onSelect={() => ir(isCliente ? "/veiculo" : `/admin/veiculos/${v.id}`)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
              >
                <Car className="size-4 text-gold" />
                {v.modelo} — {v.placa}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Documentos" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {resultados.documentos.map((d) => (
              <Command.Item
                key={d.id}
                value={d.nome}
                onSelect={() => ir(isCliente ? "/documentos" : "/admin/documentos")}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
              >
                <FolderOpen className="size-4 text-gold" />
                {d.nome}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Chamados" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {resultados.chamados.map((c) => (
              <Command.Item
                key={c.id}
                value={`${c.numero} ${c.titulo}`}
                onSelect={() => ir(isCliente ? `/atendimento/${c.id}` : `/admin/chamados/${c.id}`)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
              >
                <Headset className="size-4 text-gold" />
                {c.numero} — {c.titulo}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
