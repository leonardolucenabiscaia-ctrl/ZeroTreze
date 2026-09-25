/** O status da assinatura eletrônica (ClickSign) é uma string livre — reflete exatamente o nome
 * do evento que a API deles manda (ex.: "running", "sign", "document_closed", "close"). Usado
 * tanto pra contrato quanto pra acordo. */
export function assinaturaConcluida(status: string): boolean {
  return /closed|completed|signed|assin/i.test(status);
}
