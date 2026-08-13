import { FileCheck2 } from "lucide-react";

export default function CredenciamentosPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Credenciamentos</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
        Regularidade e conformidade
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        A Zero Treze Transportes opera em conformidade com os órgãos reguladores de transporte de
        passageiros, mantendo toda a documentação da frota e da empresa em dia.
      </p>

      <div className="mt-10 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold-muted p-6">
        <FileCheck2 className="mt-0.5 size-5 shrink-0 text-gold" />
        <div className="text-sm text-foreground">
          <p className="font-medium">Página em finalização</p>
          <p className="mt-1 text-muted-foreground">
            Assim que você me passar os números de registro (ANTT, licenças municipais, apólice de
            seguro etc.), eu coloco cada credenciamento aqui com os dados corretos.
          </p>
        </div>
      </div>
    </div>
  );
}
