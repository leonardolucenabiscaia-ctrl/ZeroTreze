/** Helper compartilhado pelos wrappers em `lib/services/*.ts` — cada um chama uma rota
 * `/api/...` (Route Handler, roda no servidor com a chave secreta do Supabase) via `fetch`,
 * mantendo a mesma assinatura de função que as páginas já usam hoje. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData (upload de arquivo) precisa que o navegador defina o Content-Type sozinho (com o
  // boundary do multipart) — forçar "application/json" aqui quebraria o envio.
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    headers: isFormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    throw new Error(corpo?.error ?? `Não foi possível completar a operação (HTTP ${res.status}).`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
