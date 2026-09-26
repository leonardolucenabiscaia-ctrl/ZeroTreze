import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import { EMPRESA } from "@/lib/constants/empresa";
import { formatCEP, formatCurrency, formatDate, formatDocument } from "@/lib/utils/formatters";
import { inteiroPorExtenso, valorPorExtenso } from "@/lib/utils/numero-por-extenso";
import type { Acordo, Cliente, Contrato, Veiculo } from "@/lib/types";

/**
 * Gera o PDF real do "Instrumento Particular de Acordo Extrajudicial" — mesmo texto jurídico da
 * tela `/imprimir/acordo/[acordoId]`, renderizado no servidor com `@react-pdf/renderer` (sem
 * depender de navegador), pra poder ser enviado à ClickSign. Mesmo padrão de `contrato-pdf.tsx`.
 */

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, lineHeight: 1.4, fontFamily: "Helvetica", color: "#171717" },
  cabecalho: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: "2pt solid #171717",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  empresaNome: { fontSize: 12, fontWeight: 700 },
  acordoNumero: { fontSize: 9, color: "#525252", textAlign: "right" },
  titulo: { fontSize: 11, fontWeight: 700, textAlign: "center", textTransform: "uppercase", marginBottom: 10 },
  secao: { marginBottom: 8 },
  secaoTitulo: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 },
  paragrafo: { marginBottom: 3, textAlign: "justify" },
  negrito: { fontWeight: 700 },
  assinaturas: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
  assinaturaBloco: { width: "45%", textAlign: "center", borderTop: "1pt solid #171717", paddingTop: 4, fontSize: 8.5 },
  testemunhas: { marginTop: 32, flexDirection: "row", justifyContent: "space-between" },
  testemunhaBloco: { width: "45%", textAlign: "center", borderTop: "1pt solid #a3a3a3", paddingTop: 4, fontSize: 8, color: "#525252" },
});

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

export interface DadosAcordoPdf {
  acordo: Acordo;
  contrato: Contrato;
  cliente: Cliente;
  veiculo: Veiculo;
}

function AcordoDocument({ acordo, contrato, cliente, veiculo }: DadosAcordoPdf) {
  const enderecoCliente = `Rua ${cliente.endereco.logradouro}, nº ${cliente.endereco.numero}${
    cliente.endereco.complemento ? `, ${cliente.endereco.complemento}` : ""
  }, Bairro: ${cliente.endereco.bairro}, ${cliente.endereco.cidade}/${cliente.endereco.estado}, CEP: ${formatCEP(
    cliente.endereco.cep
  )}`;

  const parcelas = [...acordo.cronograma].sort((a, b) => a.numero - b.numero);
  const valorParcela = parcelas[0]?.valor ?? 0;
  const primeiraParcela = parcelas[0]?.vencimento;
  const ultimaParcela = parcelas[parcelas.length - 1]?.vencimento;

  const valorTotal = formatCurrency(acordo.valorTotal);
  const valorTotalExtenso = valorPorExtenso(acordo.valorTotal);
  const valorEntrada = formatCurrency(acordo.valorEntrada);
  const valorEntradaExtenso = valorPorExtenso(acordo.valorEntrada);
  const valorParcelaFormatado = formatCurrency(valorParcela);
  const valorParcelaExtenso = valorPorExtenso(valorParcela);

  return (
    <Document title={`Acordo ${acordo.numero} — Zero Treze Transportes`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.cabecalho}>
          <Text style={styles.empresaNome}>ZERO TREZE TRANSPORTES</Text>
          <View>
            <Text style={styles.acordoNumero}>Acordo nº</Text>
            <Text style={[styles.acordoNumero, styles.negrito]}>{acordo.numero}</Text>
          </View>
        </View>

        <Text style={styles.titulo}>Instrumento Particular de Acordo Extrajudicial</Text>

        <Text style={styles.paragrafo}>
          Pelo presente e na melhor forma de direito, as partes, abaixo identificadas, de comum
          acordo, livre e espontânea vontade, resolvem firmar o presente &ldquo;Instrumento
          Particular de Acordo Extrajudicial&rdquo;, mediante as seguintes condições.
        </Text>

        <Secao titulo="Das Partes">
          <Text style={styles.paragrafo}>
            <Text style={styles.negrito}>DEVEDOR(A): </Text>
            {cliente.nome.toUpperCase()}, {cliente.nacionalidade.toLowerCase()},{" "}
            {cliente.profissao.toLowerCase()}, CNH nº {cliente.cnh.numero}, CPF nº{" "}
            {formatDocument(cliente.documento)} e RG nº {cliente.rg}, nascido em{" "}
            {formatDate(cliente.dataNascimento)}, residente e domiciliado à {enderecoCliente},
            doravante denominado apenas como DEVEDOR(A);
          </Text>
          <Text style={styles.paragrafo}>
            <Text style={styles.negrito}>CREDORA: </Text>
            {EMPRESA.razaoSocial}, pessoa jurídica de direito privado, inscrita no CNPJ nº{" "}
            {EMPRESA.cnpj}, com endereço à {EMPRESA.endereco}, representada neste ato por seus
            sócios{" "}
            {EMPRESA.socios
              .map((s) => `${s.nome}, brasileiro, empresário, portador do CPF nº ${s.cpf}`)
              .join(" e/ou ")}
            , doravante denominada simplesmente como CREDORA.
          </Text>
        </Secao>

        <Secao titulo="Do Objeto">
          <Text style={styles.paragrafo}>
            1. O presente instrumento particular tem como fundamento o contrato celebrado entre as
            partes denominado &ldquo;INSTRUMENTO PARTICULAR DE LOCAÇÃO DE VEÍCULO
            AUTOMOTOR&rdquo; (Contrato nº {contrato.numero}), que, por sua vez, tem como objeto o
            veículo {veiculo.marca.toUpperCase()} {veiculo.modelo.toUpperCase()}, ANO{" "}
            {veiculo.ano}, COR {veiculo.cor.toUpperCase()}, PLACA: {veiculo.placa}, RENAVAM:{" "}
            {veiculo.renavam}, CHASSI: {veiculo.chassi}.
          </Text>
          <Text style={styles.paragrafo}>
            1.1. No que é pertinente ao contrato descrito no item &ldquo;1&rdquo;, confessa o(a)
            DEVEDOR(A) o inadimplemento do valor de {valorTotal} ({valorTotalExtenso}), referente a
            parcelas de locação em atraso do contrato acima identificado.
          </Text>
        </Secao>

        <Secao titulo="Da Forma de Pagamento">
          <Text style={styles.paragrafo}>
            2. Fica estabelecido que o(a) DEVEDOR(A) pagará à CREDORA o valor de {valorTotal} (
            {valorTotalExtenso}), nos seguintes termos:
          </Text>
          <Text style={styles.paragrafo}>
            2.1.{" "}
            {acordo.valorEntrada > 0
              ? `Fica estipulada uma entrada no valor de ${valorEntrada} (${valorEntradaExtenso}), seguida de `
              : "Fica estipulado que a forma de pagamento será em "}
            {parcelas.length} ({parcelas.length === 1 ? "uma" : inteiroPorExtenso(parcelas.length)})
            parcela{parcelas.length === 1 ? "" : "s"} de {valorParcelaFormatado} (
            {valorParcelaExtenso}) cada, com vencimento mensal, iniciando em{" "}
            {primeiraParcela ? formatDate(primeiraParcela) : "—"} e com término em{" "}
            {ultimaParcela ? formatDate(ultimaParcela) : "—"}, via PIX, boleto bancário,
            transferência bancária, depósito em conta, cartão de crédito ou em espécie, na Conta{" "}
            {EMPRESA.contaBancaria} em nome da {EMPRESA.razaoSocial} (CNPJ/MF nº {EMPRESA.cnpj}).
          </Text>
          <Text style={styles.paragrafo}>
            2.2. Fica estabelecida cláusula penal no percentual de {EMPRESA.multaAcordoPercentual}%
            (cinquenta por cento) sobre o valor total da dívida na hipótese de inadimplemento do
            presente acordo.
          </Text>
          <Text style={styles.paragrafo}>
            2.3. O não pagamento de quaisquer das parcelas nas datas respectivas acarretará o
            vencimento antecipado da dívida, bem como o ajuizamento imediato de competente Ação de
            Execução, nos termos do art. 771 e seguintes do Código de Processo Civil, contra o(a)
            DEVEDOR(A) retro qualificado.
          </Text>
          <Text style={styles.paragrafo}>
            2.4. A CREDORA poderá bloquear o veículo caso o(a) DEVEDOR(A) se torne inadimplente,
            isto é, deixe de quitar as obrigações assumidas neste instrumento.
          </Text>
        </Secao>

        <Secao titulo="Das Disposições Finais">
          <Text style={styles.paragrafo}>
            3. Com o recebimento integral da importância acordada, a CREDORA dará ao(a) DEVEDOR(A)
            plena, geral e irrevogável quitação sobre o débito objeto do presente instrumento
            particular, permanecendo o &ldquo;INSTRUMENTO PARTICULAR DE LOCAÇÃO DE VEÍCULO
            AUTOMOTOR&rdquo; (Contrato nº {contrato.numero}), descrito no item &ldquo;1&rdquo;, em
            pleno vigor e em suas condições normais, não sendo este acordo, por si só, motivo para
            a sua rescisão.
          </Text>
        </Secao>

        <Secao titulo="Da Convenção de Arbitragem e Foro">
          <Text style={styles.paragrafo}>
            4. Para dirimir qualquer dúvida oriunda deste instrumento fica eleito o foro da comarca
            de {EMPRESA.foro}, com exclusão de qualquer outro por mais privilegiado que seja.
          </Text>
        </Secao>

        <Text style={[styles.paragrafo, { marginTop: 8, marginBottom: 20 }]}>
          {EMPRESA.foro}, {formatDate(acordo.dataInicio)}.
        </Text>

        <View style={styles.assinaturas}>
          <View style={styles.assinaturaBloco}>
            <Text>DEVEDOR(A)</Text>
            <Text>{cliente.nome.toUpperCase()}</Text>
            <Text>CPF: {formatDocument(cliente.documento)}</Text>
          </View>
          <View style={styles.assinaturaBloco}>
            <Text>CREDORA</Text>
            <Text>{EMPRESA.razaoSocial}</Text>
            <Text>CNPJ nº {EMPRESA.cnpj}</Text>
          </View>
        </View>

        <View style={styles.testemunhas}>
          {EMPRESA.testemunhas.map((nome) => (
            <Text key={nome} style={styles.testemunhaBloco}>
              {nome}
              {"\n"}Testemunha
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function gerarPdfAcordo(dados: DadosAcordoPdf): Promise<Buffer> {
  return renderToBuffer(<AcordoDocument {...dados} />);
}
