"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { buscarAcordoPorId } from "@/lib/services/acordos.service";
import { buscarContratoPorId } from "@/lib/services/contratos.service";
import { buscarClientePorId } from "@/lib/services/clientes.service";
import { buscarVeiculoPorId } from "@/lib/services/veiculos.service";
import { EMPRESA } from "@/lib/constants/empresa";
import { formatCEP, formatCurrency, formatDate, formatDocument } from "@/lib/utils/formatters";
import { inteiroPorExtenso, valorPorExtenso } from "@/lib/utils/numero-por-extenso";
import type { Acordo, Cliente, Contrato, Veiculo } from "@/lib/types";

export default function ImprimirAcordoPage() {
  const params = useParams<{ acordoId: string }>();
  const router = useRouter();

  const [acordo, setAcordo] = React.useState<Acordo | null>(null);
  const [contrato, setContrato] = React.useState<Contrato | null>(null);
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    buscarAcordoPorId(params.acordoId).then(async (a) => {
      if (!a) {
        setCarregando(false);
        return;
      }
      setAcordo(a);
      const contratoEncontrado = await buscarContratoPorId(a.contratoId);
      setContrato(contratoEncontrado ?? null);
      const [clienteEncontrado, veiculoEncontrado] = await Promise.all([
        buscarClientePorId(a.clienteId),
        contratoEncontrado ? buscarVeiculoPorId(contratoEncontrado.veiculoId) : Promise.resolve(undefined),
      ]);
      setCliente(clienteEncontrado ?? null);
      setVeiculo(veiculoEncontrado ?? null);
      setCarregando(false);
    });
  }, [params.acordoId]);

  if (carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-neutral-500">
        Carregando acordo…
      </div>
    );
  }

  if (!acordo || !contrato || !cliente || !veiculo) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white text-neutral-700">
        <p className="text-sm">Não foi possível carregar este acordo para impressão.</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
      </div>
    );
  }

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
    <div className="min-h-dvh bg-neutral-200 print:bg-white">
      <style>{`
        @page { margin: 2cm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          .no-print { display: none !important; }
          .folha { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-neutral-300 bg-white px-6 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <Printer className="size-4" />
          Imprimir acordo
        </button>
      </div>

      <div className="folha mx-auto my-8 max-w-[210mm] bg-white p-[18mm] text-[13px] leading-relaxed text-neutral-900 shadow-lg print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-neutral-900 px-6 py-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagens estáticas, otimização do next/image indisponível (sharp sem build nativo) */}
            <img
              src="/logo-zero-treze.webp"
              alt="Zero Treze Transportes"
              width={68}
              height={68}
              className="rounded-lg"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/frota-zero-treze.webp"
              alt="Frota de veículos Zero Treze"
              className="hidden h-14 w-auto rounded-md sm:block print:block"
            />
          </div>
          <div className="shrink-0 text-right text-xs text-neutral-400">
            <p>Acordo nº</p>
            <p className="font-semibold text-white">{acordo.numero}</p>
          </div>
        </header>

        <h1 className="mb-4 text-center text-sm font-bold uppercase">
          Instrumento Particular de Acordo Extrajudicial
        </h1>

        <p className="mb-4">
          Pelo presente e na melhor forma de direito, as partes, abaixo identificadas, de comum
          acordo, livre e espontânea vontade, resolvem firmar o presente &ldquo;Instrumento
          Particular de Acordo Extrajudicial&rdquo;, mediante as seguintes condições.
        </p>

        <Secao titulo="Das Partes">
          <p>
            <strong>DEVEDOR(A):</strong> {cliente.nome.toUpperCase()}, {cliente.nacionalidade.toLowerCase()},{" "}
            {cliente.profissao.toLowerCase()}, CNH nº {cliente.cnh.numero}, CPF nº{" "}
            {formatDocument(cliente.documento)} e RG nº {cliente.rg}, nascido em{" "}
            {formatDate(cliente.dataNascimento)}, residente e domiciliado à {enderecoCliente},
            doravante denominado apenas como DEVEDOR(A);
          </p>
          <p>
            <strong>CREDORA:</strong> {EMPRESA.razaoSocial}, pessoa jurídica de direito privado,
            inscrita no CNPJ nº {EMPRESA.cnpj}, com endereço à {EMPRESA.endereco}, representada
            neste ato por seus sócios{" "}
            {EMPRESA.socios
              .map((s) => `${s.nome}, brasileiro, empresário, portador do CPF nº ${s.cpf}`)
              .join(" e/ou ")}
            , doravante denominada simplesmente como CREDORA.
          </p>
        </Secao>

        <Secao titulo="Do Objeto">
          <p>
            1. O presente instrumento particular tem como fundamento o contrato celebrado entre as
            partes denominado &ldquo;INSTRUMENTO PARTICULAR DE LOCAÇÃO DE VEÍCULO
            AUTOMOTOR&rdquo; (Contrato nº {contrato.numero}), que, por sua vez, tem como objeto o
            veículo {veiculo.marca.toUpperCase()} {veiculo.modelo.toUpperCase()}, ANO{" "}
            {veiculo.ano}, COR {veiculo.cor.toUpperCase()}, PLACA: {veiculo.placa}, RENAVAM:{" "}
            {veiculo.renavam}, CHASSI: {veiculo.chassi}.
          </p>
          <p>
            1.1. No que é pertinente ao contrato descrito no item &ldquo;1&rdquo;, confessa o(a)
            DEVEDOR(A) o inadimplemento do valor de {valorTotal} ({valorTotalExtenso}), referente a
            parcelas de locação em atraso do contrato acima identificado.
          </p>
        </Secao>

        <Secao titulo="Da Forma de Pagamento">
          <p>
            2. Fica estabelecido que o(a) DEVEDOR(A) pagará à CREDORA o valor de {valorTotal} (
            {valorTotalExtenso}), nos seguintes termos:
          </p>
          <p>
            2.1.{" "}
            {acordo.valorEntrada > 0 ? (
              <>
                Fica estipulada uma entrada no valor de {valorEntrada} ({valorEntradaExtenso}),
                seguida de{" "}
              </>
            ) : (
              "Fica estipulado que a forma de pagamento será em "
            )}
            {parcelas.length} ({parcelas.length === 1 ? "uma" : inteiroPorExtenso(parcelas.length)})
            parcela{parcelas.length === 1 ? "" : "s"} de {valorParcelaFormatado} ({valorParcelaExtenso})
            cada, com vencimento mensal, iniciando em{" "}
            {primeiraParcela ? formatDate(primeiraParcela) : "—"} e com término em{" "}
            {ultimaParcela ? formatDate(ultimaParcela) : "—"}, via PIX, boleto bancário,
            transferência bancária, depósito em conta, cartão de crédito ou em espécie, na Conta{" "}
            {EMPRESA.contaBancaria} em nome da {EMPRESA.razaoSocial} (CNPJ/MF nº {EMPRESA.cnpj}).
          </p>
          <p>
            2.2. Fica estabelecida cláusula penal no percentual de {EMPRESA.multaAcordoPercentual}%
            (cinquenta por cento) sobre o valor total da dívida na hipótese de inadimplemento do
            presente acordo.
          </p>
          <p>
            2.3. O não pagamento de quaisquer das parcelas nas datas respectivas acarretará o
            vencimento antecipado da dívida, bem como o ajuizamento imediato de competente Ação de
            Execução, nos termos do art. 771 e seguintes do Código de Processo Civil, contra o(a)
            DEVEDOR(A) retro qualificado.
          </p>
          <p>
            2.4. A CREDORA poderá bloquear o veículo caso o(a) DEVEDOR(A) se torne inadimplente,
            isto é, deixe de quitar as obrigações assumidas neste instrumento.
          </p>
        </Secao>

        <Secao titulo="Das Disposições Finais">
          <p>
            3. Com o recebimento integral da importância acordada, a CREDORA dará ao(a) DEVEDOR(A)
            plena, geral e irrevogável quitação sobre o débito objeto do presente instrumento
            particular, permanecendo o &ldquo;INSTRUMENTO PARTICULAR DE LOCAÇÃO DE VEÍCULO
            AUTOMOTOR&rdquo; (Contrato nº {contrato.numero}), descrito no item &ldquo;1&rdquo;, em
            pleno vigor e em suas condições normais, não sendo este acordo, por si só, motivo para
            a sua rescisão.
          </p>
        </Secao>

        <Secao titulo="Da Convenção de Arbitragem e Foro">
          <p>
            4. Para dirimir qualquer dúvida oriunda deste instrumento fica eleito o foro da comarca
            de {EMPRESA.foro}, com exclusão de qualquer outro por mais privilegiado que seja.
          </p>
        </Secao>

        <p className="mb-10">{EMPRESA.foro}, {formatDate(acordo.criadoEm, "dd 'de' MMMM 'de' yyyy")}.</p>

        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="mb-1 border-t border-neutral-900 pt-1">DEVEDOR(A)</div>
            <p>{cliente.nome.toUpperCase()}</p>
            <p>CPF: {formatDocument(cliente.documento)}</p>
          </div>
          <div>
            <div className="mb-1 border-t border-neutral-900 pt-1">CREDORA</div>
            <p>{EMPRESA.razaoSocial}</p>
            <p>CNPJ: {EMPRESA.cnpj}</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-neutral-500">
          {EMPRESA.testemunhas.map((nome) => (
            <div key={nome} className="border-t border-neutral-400 pt-1">
              {nome}
              <br />
              Testemunha
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-1.5 text-xs font-bold uppercase">{titulo}</h2>
      <div className="flex flex-col gap-1.5 text-justify">{children}</div>
    </section>
  );
}
