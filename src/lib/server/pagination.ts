import "server-only";

const TAMANHO_PAGINA = 1000;

/** O PostgREST corta cada requisição em 1000 linhas por padrão — qualquer consulta que possa
 * devolver mais que isso precisa paginar com `.range()` ou trunca em silêncio (sem erro nenhum —
 * só devolve menos linhas do que existem de verdade). Esse helper faz isso genericamente: recebe
 * uma função que monta a query dado um intervalo, e repete até a última página vir incompleta. */
export async function paginarTodasAsLinhas<T>(
  montarQuery: (inicio: number, fim: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const todas: T[] = [];
  let pagina = 0;

  while (true) {
    const inicio = pagina * TAMANHO_PAGINA;
    const { data, error } = await montarQuery(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw new Error(error.message);
    todas.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    pagina++;
  }

  return todas;
}
