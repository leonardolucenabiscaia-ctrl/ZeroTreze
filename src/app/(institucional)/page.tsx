import Link from "next/link";
import { Award, Bus, Car, Clock, FileCheck2, MapPin, MessageCircle, ShieldCheck, Users } from "lucide-react";

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

const VALORES = [
  {
    icon: ShieldCheck,
    titulo: "Segurança",
    descricao: "Frota revisada periodicamente e motoristas preparados para cuidar de cada trajeto do início ao fim.",
  },
  {
    icon: Clock,
    titulo: "Pontualidade",
    descricao: "Compromisso com horários — para transporte corporativo, cada minuto importa.",
  },
  {
    icon: Award,
    titulo: "Qualidade",
    descricao: "Veículos confortáveis e um atendimento pensado para superar expectativas em cada viagem.",
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
      <section id="inicio">
        <HeroSlider slides={SLIDES} />
      </section>

      {/* Sobre Nós — logo abaixo dos slides */}
      <section id="sobre-nos" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Sobre nós</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Zero Treze Transportes</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Atuamos no transporte de passageiros na região de Peruíbe, Baixada Santista e Grande
            São Paulo, oferecendo fretamento diário, transporte executivo e excursões turísticas.
            Nosso objetivo é simples: levar cada passageiro com segurança, pontualidade e o máximo
            de conforto, do primeiro ao último quilômetro.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {VALORES.map((valor) => (
              <div key={valor.titulo} className="rounded-xl border border-border bg-card p-6">
                <valor.icon className="size-6 text-gold" />
                <h2 className="mt-4 text-lg font-semibold text-foreground">{valor.titulo}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{valor.descricao}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 border-t border-border pt-12">
            <h2 className="text-center text-2xl font-bold text-foreground">SOBRE NÓS</h2>
            <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-4 text-muted-foreground">
              <p>
                Com uma sólida experiência no ramo de transporte executivo, a Zero Treze
                Transportes e Turismo possui a proposta de oferecer o serviço Premium, atuando em
                operações de linhas de fretamento corporativo e turismo na Baixa Santista, Grande
                São Paulo e demais regiões.
              </p>
              <p>
                Dispomos de uma infraestrutura completa, contando com garagem e oficina própria
                para qualidade, rapidez e eficiência em nossos serviços.
              </p>
              <p>
                Valorizamos a dedicação no atendimento, informações e negociações com o cliente.
                Prezamos por padrões de qualidade em todos os processos do transporte, do embarque
                à chegada dos passageiros em seus destinos.
              </p>
              <p>
                A ZERO TREZE Transportes e Turismo prioriza a fidelização dos seus clientes por
                meio da completa satisfação e captação de novos parceiros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Nossos serviços</p>
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
        </div>
      </section>

      {/* Credenciamentos */}
      <section id="credenciamentos" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Credenciamentos</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            Regularidade e conformidade
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            A Zero Treze Transportes opera em conformidade com os órgãos reguladores de transporte
            de passageiros, mantendo toda a documentação da frota e da empresa em dia.
          </p>

          <div className="mt-10 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold-muted p-6">
            <FileCheck2 className="mt-0.5 size-5 shrink-0 text-gold" />
            <div className="text-sm text-foreground">
              <p className="font-medium">Página em finalização</p>
              <p className="mt-1 text-muted-foreground">
                Assim que você me passar os números de registro (ANTT, licenças municipais,
                apólice de seguro etc.), eu coloco cada credenciamento aqui com os dados corretos.
              </p>
            </div>
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
            <div className="rounded-xl border border-border bg-card p-6">
              <MapPin className="size-6 text-gold" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">Endereço</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Rua Antônio Pereira Roque, nº 882, Parque Balneário Oasis, Peruíbe/SP — CEP
                11.750-000
              </p>
            </div>

            <div className="rounded-xl border border-gold/30 bg-gold-muted p-6">
              <MessageCircle className="size-6 text-gold" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">Telefone e e-mail</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Página em finalização — me passe o telefone/WhatsApp e o e-mail de contato que
                você quer publicar aqui.
              </p>
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
