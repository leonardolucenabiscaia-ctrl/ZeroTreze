import { MapPin, MessageCircle } from "lucide-react";

export default function ContatoPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Contato</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">Fale com a gente</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Tire dúvidas, peça um orçamento ou fale sobre fretamento, transporte executivo e
        excursões.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <MapPin className="size-6 text-gold" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Endereço</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Rua Antônio Pereira Roque, nº 882, Parque Balneário Oasis, Peruíbe/SP — CEP 11.750-000
          </p>
        </div>

        <div className="rounded-xl border border-gold/30 bg-gold-muted p-6">
          <MessageCircle className="size-6 text-gold" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Telefone e e-mail</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Página em finalização — me passe o telefone/WhatsApp e o e-mail de contato que você
            quer publicar aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
