export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estático, otimização do next/image indisponível (sharp sem build nativo) */}
          <img
            src="/logo-zero-treze.webp"
            alt="Zero Treze Transportes"
            width={64}
            height={64}
            className="rounded-2xl"
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Zero Treze Transportes</h1>
            <p className="text-sm text-muted-foreground">Portal do Locatário</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
