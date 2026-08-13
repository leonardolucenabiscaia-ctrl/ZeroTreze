import Link from "next/link";
import { Bus, Car, ShieldCheck, Users } from "lucide-react";

import { HeroSlider } from "@/components/shared/hero-slider";

const SLIDES = [
  {
    titulo: "Fretamento Diário",
    subtitulo: "Transporte corporativo e industrial com pontualidade e segurança, todos os dias.",
  },
  {
    titulo: "Transporte Executivo",
    subtitulo: "Conforto e discrição para executivos, eventos e ocasiões especiais.",
  },
  {
    titulo: "Excursão e Turismo",
    subtitulo: "Viagens em grupo com toda a estrutura, do embarque ao destino.",
  },
];

const SERVICOS = [
  {
    icon: Bus,
    titulo: "Fretamento Diário",
    descricao: "Transporte de funcionários e equipes com rotas fixas, pontualidade e segurança no dia a dia.",
  },
  {
    icon: Car,
    titulo: "Transporte Executivo",
    descricao: "Veículos de alto padrão para executivos, reuniões e eventos corporativos.",
  },
  {
    icon: Users,
    titulo: "Excursão e Turismo",
    descricao: "Viagens em grupo para eventos, passeios e turismo religioso, com estrutura completa.",
  },
];

export default function InicioPage() {
  return (
    <div className="flex flex-col">
      <HeroSlider slides={SLIDES} />

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-2 text-gold">
          <ShieldCheck className="size-5" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em]">Nossos serviços</p>
        </div>
        <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Soluções completas em transporte
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {SERVICOS.map((servico) => (
            <div key={servico.titulo} className="rounded-xl border border-border bg-card p-6">
              <servico.icon className="size-6 text-gold" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{servico.titulo}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{servico.descricao}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/contato"
            className="rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-gold-foreground transition-opacity hover:opacity-90"
          >
            Fale conosco
          </Link>
          <Link
            href="/sobre-nos"
            className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Conheça a empresa
          </Link>
        </div>
      </section>
    </div>
  );
}
