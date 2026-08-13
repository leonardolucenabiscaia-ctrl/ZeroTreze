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
    </div>
  );
}
