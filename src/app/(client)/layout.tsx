import { ClientShell } from "@/components/layout/client-shell";

export default function PortalClienteLayout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
