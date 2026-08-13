import Link from "next/link";
import { Mail, Phone } from "lucide-react";

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

export default function InicioPage() {
  return (
    <div className="flex flex-col">
      <section id="inicio">
        <HeroSlider slides={SLIDES} />
      </section>

      {/* Sobre Nós — logo abaixo dos slides */}
      <section id="sobre-nos" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-foreground">SOBRE NÓS</h2>
          <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-4 text-muted-foreground">
            <p>
              Com uma sólida experiência no ramo de transporte executivo, a Zero Treze Transportes
              e Turismo possui a proposta de oferecer o serviço Premium, atuando em operações de
              linhas de fretamento corporativo e turismo na Baixa Santista, Grande São Paulo e
              demais regiões.
            </p>
            <p>
              Dispomos de uma infraestrutura completa, contando com garagem e oficina própria para
              qualidade, rapidez e eficiência em nossos serviços.
            </p>
            <p>
              Valorizamos a dedicação no atendimento, informações e negociações com o cliente.
              Prezamos por padrões de qualidade em todos os processos do transporte, do embarque à
              chegada dos passageiros em seus destinos.
            </p>
            <p>
              A ZERO TREZE Transportes e Turismo prioriza a fidelização dos seus clientes por meio
              da completa satisfação e captação de novos parceiros.
            </p>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element -- imagem estática da frota */}
          <img
            src="/frota-zero-treze.webp"
            alt="Frota da Zero Treze Transportes: sedan, van e ônibus"
            className="mx-auto mt-10 w-full max-w-3xl"
          />

          <div className="mt-16 grid gap-10 sm:grid-cols-2">
            <div className="flex flex-col gap-8">
              <div>
                <h3 className="text-center text-xl font-bold text-foreground">MISSÃO</h3>
                <p className="mt-4 text-center text-muted-foreground">
                  Oferecer transporte com segurança, qualidade, pontualidade, atingindo o grau
                  máximo de satisfação dos nossos clientes.
                </p>
              </div>
              <div>
                <h3 className="text-center text-xl font-bold text-foreground">VISÃO</h3>
                <p className="mt-4 text-center text-muted-foreground">
                  Estar entre as melhores Empresas nacionais de Transporte de Pessoas e ser
                  reconhecida pela excelência no atendimento ao cliente, colaboradores e parceiros.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-center text-xl font-bold text-foreground">VALORES</h3>
              <ul className="mt-4 flex flex-col gap-2 text-muted-foreground">
                <li>- Segurança. A vida em primeiro lugar;</li>
                <li>- Reconhecimento por quem faz nossa empresa;</li>
                <li>- Comprometimento com a qualidade e resultados;</li>
                <li>- Respeito aos nossos clientes, colaboradores e parceiros;</li>
                <li>- Honestidade em nossa conduta e gerenciamento;</li>
                <li>- Simplicidade e Transparência em nosso relacionamento e comunicação.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Credenciamentos */}
      <section id="credenciamentos" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Credenciamentos</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            Órgãos que credenciam a Zero Treze
          </h2>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 rounded-xl bg-white p-8 sm:justify-between">
            {[
              { src: "/credenciamentos/antt.png", alt: "ANTT — Agência Nacional de Transportes Terrestres" },
              { src: "/credenciamentos/artesp.png", alt: "ARTESP" },
              { src: "/credenciamentos/emtu.png", alt: "EMTU" },
              { src: "/credenciamentos/embratur.png", alt: "EMBRATUR" },
            ].map((logo) => (
              // eslint-disable-next-line @next/next/no-img-element -- logos estáticos de órgãos reguladores
              <img key={logo.src} src={logo.src} alt={logo.alt} className="h-10 w-auto object-contain sm:h-12" />
            ))}
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Contato</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Fale com a gente</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Tire dúvidas, peça um orçamento ou fale sobre fretamento, transporte executivo e
            excursões.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gold/30 bg-gold-muted p-6">
              <Phone className="size-6 text-gold" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">Telefone</h3>
              <a
                href="https://wa.me/5513992030351"
                className="mt-2 block text-sm text-muted-foreground hover:text-gold"
              >
                (13) 99203-0351
              </a>
            </div>

            <div className="rounded-xl border border-gold/30 bg-gold-muted p-6">
              <Mail className="size-6 text-gold" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">E-mail</h3>
              <a
                href="mailto:comercial@zerotrezetransportes.com.br"
                className="mt-2 block text-sm text-muted-foreground hover:text-gold"
              >
                comercial@zerotrezetransportes.com.br
              </a>
            </div>
          </div>

          <Link
            href="/login"
            className="mt-10 inline-block rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-gold-foreground transition-opacity hover:opacity-90"
          >
            Acessar área do cliente
          </Link>
        </div>
      </section>
    </div>
  );
}
