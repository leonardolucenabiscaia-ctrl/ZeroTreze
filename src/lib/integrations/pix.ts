import { EMPRESA } from "@/lib/constants/empresa";

function campo(id: string, valor: string): string {
  if (!valor) return "";
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Remove acentos e coloca em maiúsculas — o padrão BR Code do Pix só aceita ASCII. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

/** CRC-16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF) — o algoritmo exigido pelo manual
 * de padrões para iniciação do Pix (Banco Central) para o campo de checksum do BR Code. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Monta o BR Code (payload EMV) de um Pix estático da empresa — sempre a mesma chave (CNPJ),
 * SEM valor definido (quem paga digita o valor no próprio banco), reutilizável, sem expiração e
 * sem depender de nenhum PSP/API externa. Formato conforme o manual de padrões para iniciação do
 * Pix do Banco Central (validado campo a campo contra a lib de referência `pix-utils`, sem
 * precisar adicioná-la como dependência). */
export function gerarPixEstatico(): string {
  const chave = EMPRESA.chavePix.replace(/\D/g, "");
  const nome = normalizar(EMPRESA.razaoSocial).slice(0, 25);
  // EMPRESA não tem um campo de cidade isolado — extraído do endereço fiscal (Peruíbe/SP).
  const cidade = normalizar("Peruibe").slice(0, 15);

  const infoConta = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  const dadosAdicionais = campo("05", "***"); // txid genérico — não é uma cobrança específica

  const payload =
    campo("00", "01") + // Payload Format Indicator
    campo("26", infoConta) + // Merchant Account Information (Pix)
    campo("52", "0000") + // Merchant Category Code
    campo("53", "986") + // Moeda: BRL
    campo("58", "BR") + // País
    campo("59", nome) + // Nome do recebedor
    campo("60", cidade) + // Cidade
    campo("62", dadosAdicionais) + // Dados adicionais (txid)
    "6304"; // ID + tamanho do CRC — o valor é calculado a seguir, sobre essa string inteira

  return payload + crc16(payload);
}
