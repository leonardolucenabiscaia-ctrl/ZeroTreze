import { delay } from "./delay";

export type FormatoRelatorio = "pdf" | "excel" | "csv";
export type TipoRelatorio =
  | "financeiro"
  | "contratos"
  | "clientes"
  | "veiculos"
  | "inadimplencia"
  | "pagamentos"
  | "multas"
  | "chamados"
  | "score"
  | "renovacoes";

/**
 * Stub de geração de relatório — nesta fase apenas simula o processamento.
 * Ponto de troca futuro: substituir por chamada a um serviço real de geração
 * (ex.: fila de exportação no backend) mantendo a mesma assinatura.
 */
export async function gerarRelatorio(
  tipo: TipoRelatorio,
  formato: FormatoRelatorio
): Promise<{ nomeArquivo: string }> {
  await delay(1200);
  const extensao = formato === "excel" ? "xlsx" : formato;
  return { nomeArquivo: `relatorio-${tipo}-${Date.now()}.${extensao}` };
}
