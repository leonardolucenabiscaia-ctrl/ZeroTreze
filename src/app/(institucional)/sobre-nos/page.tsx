import { Award, Clock, ShieldCheck } from "lucide-react";

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

export default function SobreNosPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Sobre nós</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Zero Treze Transportes</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Atuamos no transporte de passageiros na região de Peruíbe, Baixada Santista e Grande São
        Paulo, oferecendo fretamento diário, transporte executivo e excursões turísticas. Nosso
        objetivo é simples: levar cada passageiro com segurança, pontualidade e o máximo de
        conforto, do primeiro ao último quilômetro.
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
            Com uma sólida experiência no ramo de transporte executivo, a Zero Treze Transportes e
            Turismo possui a proposta de oferecer o serviço Premium, atuando em operações de
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
      </div>
    </div>
  );
}
