"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { buscarContratoPorId } from "@/lib/services/contratos.service";
import { buscarClientePorId } from "@/lib/services/clientes.service";
import { buscarVeiculoPorId } from "@/lib/services/veiculos.service";
import { EMPRESA } from "@/lib/constants/empresa";
import { formatCEP, formatCurrency, formatDate, formatDocument } from "@/lib/utils/formatters";
import { valorPorExtenso } from "@/lib/utils/numero-por-extenso";
import type { Cliente, Contrato, Veiculo } from "@/lib/types";

export default function ImprimirContratoPage() {
  const params = useParams<{ contratoId: string }>();
  const router = useRouter();

  const [contrato, setContrato] = React.useState<Contrato | null>(null);
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    buscarContratoPorId(params.contratoId).then(async (c) => {
      if (!c) {
        setCarregando(false);
        return;
      }
      setContrato(c);
      const [clienteEncontrado, veiculoEncontrado] = await Promise.all([
        buscarClientePorId(c.clienteId),
        buscarVeiculoPorId(c.veiculoId),
      ]);
      setCliente(clienteEncontrado ?? null);
      setVeiculo(veiculoEncontrado ?? null);
      setCarregando(false);
    });
  }, [params.contratoId]);

  if (carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-neutral-500">
        Carregando contrato…
      </div>
    );
  }

  if (!contrato || !cliente || !veiculo) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white text-neutral-700">
        <p className="text-sm">Não foi possível carregar este contrato para impressão.</p>
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

  const valorSemanal = formatCurrency(contrato.valorParcela);
  const valorSemanalExtenso = valorPorExtenso(contrato.valorParcela);
  const valorCaucao = formatCurrency(contrato.valorCaucao);
  const valorCaucaoExtenso = valorPorExtenso(contrato.valorCaucao);
  const valorFranquia = formatCurrency(EMPRESA.franquiaProtecaoVeicular);
  const valorMultaKm = formatCurrency(EMPRESA.multaKmNaoAvisado);

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
          Imprimir contrato
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
            <p>Contrato nº</p>
            <p className="font-semibold text-white">{contrato.numero}</p>
          </div>
        </header>

        <h1 className="mb-4 text-center text-sm font-bold uppercase">
          Instrumento Particular de Locação de Veículo Automotor
        </h1>

        <p className="mb-4">
          Pelo presente e na melhor forma de direito, as partes, abaixo identificadas, de comum
          acordo e de livre e espontânea vontade, resolvem firmar o presente instrumento, mediante as
          seguintes condições e sob a legislação vigente.
        </p>

        <Secao titulo="Das Partes">
          <p>
            <strong>CONTRATANTE:</strong> {cliente.nome.toUpperCase()}, {cliente.nacionalidade.toLowerCase()},{" "}
            {cliente.profissao.toLowerCase()}, CNH nº {cliente.cnh.numero}, inscrito no CPF nº{" "}
            {formatDocument(cliente.documento)} e RG nº {cliente.rg}, com endereço à {enderecoCliente}.
          </p>
          <p>
            <strong>LOCADORA:</strong> {EMPRESA.razaoSocial}, pessoa jurídica de direito privado,
            inscrita no CNPJ nº {EMPRESA.cnpj}, com endereço à {EMPRESA.endereco}, representada
            neste ato por seus sócios{" "}
            {EMPRESA.socios
              .map((s) => `${s.nome}, brasileiro, empresário, portador do CPF nº ${s.cpf}`)
              .join(" e/ou ")}
            .
          </p>
        </Secao>

        <Secao titulo="Do Objeto">
          <p>
            1.1. O presente instrumento tem como objeto regular a locação particular de veículo
            automotor, conforme CRLV anexo ao presente, de propriedade, posse, uso e gozo da
            LOCADORA ao CONTRATANTE, nas condições do presente instrumento.
          </p>
          <p>1.2. O veículo automotor locado neste ato corresponde ao:</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 pl-4">
            <Campo label="Marca" valor={veiculo.marca.toUpperCase()} />
            <Campo label="Modelo" valor={veiculo.modelo.toUpperCase()} />
            <Campo label="Ano" valor={String(veiculo.ano)} />
            <Campo label="Placa" valor={veiculo.placa} />
            <Campo label="Renavam" valor={veiculo.renavam} />
            <Campo label="Chassi" valor={veiculo.chassi} />
            <Campo label="Cor" valor={veiculo.cor.toUpperCase()} />
          </dl>
        </Secao>

        <Secao titulo="Da Vigência e da Rescisão">
          <p>
            2.1. O presente é firmado por prazo indeterminado, porém mínimo de 6 (seis) meses,
            válido a contar da data de sua assinatura, {formatDate(contrato.dataInicio)}, por
            livre ajuste entre as partes.
          </p>
          <p>
            2.2. Este poderá ser rescindido, por mútuo acordo entre as partes ou por vontade
            unilateral, desde que mediante manifestação escrita, com antecedência mínima de 30
            (trinta) dias.
          </p>
          <p>
            2.3. O descumprimento de qualquer uma das condições do presente instrumento ensejará a
            sua imediata rescisão, não isentando a parte infratora do não cumprimento de suas
            obrigações.
          </p>
          <p className="pl-4">
            2.3.1. Em caso de inadimplemento, fica o(a) CONTRATANTE obrigado a regularizar o
            pagamento dentro do prazo de 24 (vinte e quatro) horas, contadas do inadimplemento.
          </p>
          <p className="pl-8">
            2.3.1.2. Vencido o prazo da cláusula 2.3.1, fica o(a) CONTRATANTE obrigado a realizar a
            entrega do veículo dentro do prazo de 48 (quarenta e oito) horas, contadas do
            inadimplemento.
          </p>
          <p className="pl-8">
            2.3.1.3. Passados os prazos de inadimplência e de entrega do veículo, o(a) CONTRATANTE
            fica ciente de que a LOCADORA, através de bloqueio, rastreador e chave reserva ou
            utilizando-se de outros meios legais, está autorizada a retomar a posse do veículo, a
            qualquer título e em qualquer momento.
          </p>
          <p>
            2.4. A rescisão se dará por completo, somente com a entrega do veículo locado e demais
            itens que o acompanhem, bem como com o cumprimento de todas as obrigações previstas no
            presente instrumento.
          </p>
          <p>2.5. Este será rescindido automaticamente na ocorrência de:</p>
          <p className="pl-4">
            a) Insolvência, dissolução judicial ou extrajudicial, pedido de recuperação judicial,
            decretação de falência de qualquer das partes;
          </p>
          <p className="pl-4">
            b) Força maior, conforme previsto e definido no art. 393, parágrafo único do Código
            Civil e;
          </p>
          <p className="pl-4">c) Descumprimento de qualquer das cláusulas e condições do presente.</p>
          <p>
            2.6. A rescisão prevista nas alíneas acima do item 2.5, desde que preenchidos os
            requisitos ali estabelecidos, não acarretará o pagamento de multa.
          </p>
        </Secao>

        <Secao titulo="Forma de Pagamento, Multa e Reajuste">
          <p>
            3.1. Pela locação acertada neste instrumento, CONTRATANTE se compromete a pagar a
            LOCADORA, <strong>semanalmente e obrigatoriamente às segundas-feiras até às 23h59</strong>,
            o valor de {valorSemanal} ({valorSemanalExtenso}), através de transferência bancária{" "}
            {EMPRESA.contaBancaria} ou Pix {EMPRESA.chavePix}.
          </p>
          <p>
            3.2. Fica também acordado que o CONTRATANTE, neste ato, deverá dispor, em favor da
            LOCADORA, caução no valor de {valorCaucao} ({valorCaucaoExtenso}), a fim de
            resguardar-se a LOCADORA sob eventuais ocorrências, respeitados os termos do presente,
            durante a vigência deste.
          </p>
          <p className="pl-4">
            3.2.1. Caso não sobrevenha nenhuma intercorrência no que tange ao inadimplemento do(a)
            CONTRATANTE enquanto sob a vigência do presente instrumento, a LOCADORA devolverá após
            30 dias a caução integralmente, após assinatura do termo de rescisão.
          </p>
          <p className="pl-4">
            3.2.2. Fica autorizado pelo CONTRATANTE, caso seja necessário, a LOCADORA utilizar-se
            da caução para abatimento de qualquer valor inadimplido que sobrevenha sobre este
            instrumento, desde que seja apresentado contraprestação do custo/despesa.
          </p>
          <p>
            3.3. A LOCADORA poderá, mediante aviso prévio ao CONTRATANTE de 30 (trinta) dias,
            realizar reajustes no valor do contrato, restando facultado ao CONTRATANTE a sua
            rescisão.
          </p>
          <p className="pl-4">
            3.3.1. Caso o CONTRATANTE decida rescindir o presente em razão de reajuste da locação,
            ficará dispensada qualquer tipo de multa por rescisão contratual.
          </p>
          <p>
            3.4. Acordam as partes que na ocorrência de inadimplemento aplicar-se-á atualização
            monetária com base no IPCA, multa de {EMPRESA.multaAtrasoPercentual}% (vinte por cento)
            sob o valor da locação e juros de mora de {formatCurrency(EMPRESA.jurosMoraDiario)} por
            dia, desde o primeiro dia após seu vencimento, até a data do efetivo pagamento.
          </p>
          <p>
            3.5. Em caso de atraso no pagamento, a LOCADORA está autorizada a protestar o débito, a
            incluir o nome da(o) CONTRATANTE nos órgãos de proteção de crédito, independentemente de
            qualquer notificação, bem como sem prejuízo de encaminhar os valores devidos para
            cobrança extrajudicial ou judicial.
          </p>
          <p className="pl-4">
            3.5.1. Sem prejuízo de todas as despesas referentes à cobrança, fica acordado o
            acréscimo dos honorários advocatícios em {EMPRESA.honorariosAdvocaticiosPercentual}%
            (vinte por cento) independente da cobrança ser administrativa ou judicial, bem como não
            afetará as cobranças das semanas posteriores a inadimplida, caso não seja restituído o
            veículo.
          </p>
          <p>
            3.7. As despesas inerentes ao mau uso do veículo locado, enquanto perdurar a locação,
            ficam EXCLUSIVAMENTE a cargo do CONTRATANTE, desobrigando de qualquer responsabilidade
            solidária ou reembolso, a CONTRATANTE.
          </p>
        </Secao>

        <Secao titulo="Das Obrigações da Locadora">
          <p>
            4.1. A LOCADORA será responsável por disponibilizar o veículo limpo, com tanque cheio,
            em perfeitas condições de uso, funcionamento e segurança, bem com todos os equipamentos
            e documentos exigidos pela legislação aplicável.
          </p>
          <p>
            4.2. A LOCADORA vistoriará e documentará a entrega e o recebimento do veículo (termos
            anexos), registrando o estado de conservação em que o mesmo se encontra, itens e
            acessórios que possui, bem como documentação regularmente em dia, conforme legislação
            aplicável, sendo necessária a ciência do CONTRATANTE.
          </p>
          <p>
            4.3. Caso o veículo contratado venha a apresentar defeito não causado pelo(a)
            CONTRATANTE, facultar-se-á a LOCADORA a realizar a troca do veículo por outro que esteja
            disponível no momento e caso não seja o veículo trocado, necessariamente deverá
            rescindir o contrato sem aplicação de multa ou ônus ao CONTRATANTE.
          </p>
        </Secao>

        <Secao titulo="Das Obrigações do Contratante">
          <p>
            5.1. O CONTRATANTE, após dar ciência da vistoria realizada na entrega do veículo,
            receberá, usará e cuidará do veículo, como se proprietário fosse tomando todos os
            cuidados necessários para preservar o estado físico e funcionamento do veículo.
          </p>
          <p>
            5.2. Está vedado ao CONTRATANTE permitir que outra pessoa que não ele, faça uso do
            veículo que lhe fora locado.
          </p>
          <p>
            5.3. O(a) CONTRATANTE fica obrigado a apresentar toda a documentação exigida no ato da
            locação pela CONTRATADA, sob pena de não ter o veículo locado.
          </p>
          <p>
            5.4. O(a) CONTRATANTE assume a posse precária e autônoma do veículo, para todos os fins
            de direito, obrigando-se a usar o veículo corretamente, não incorrendo em nenhuma
            hipótese de uso inadequado dele.
          </p>
          <p>
            5.5. O(a) CONTRATANTE se obriga a não efetuar qualquer reparo ou serviço no veículo sem
            a expressa e prévia anuência da LOCADORA, sob pena de não ser reembolsado por tais
            serviços e ainda arcar com eventuais danos ao veículo.
          </p>
          <p>
            5.6. O(a) CONTRATANTE responsabiliza-se integralmente pelo uso do veículo, respondendo,
            inclusive, pelos passageiros e objetos que vier a transportar ou que estejam no interior
            do veículo enquanto estiver locado.
          </p>
          <p>
            5.7. O(a) CONTRATANTE deverá comunicar imediatamente à LOCADORA qualquer acidente com o
            veículo, bem como a ocorrência de roubo ou furto, e providenciar o boletim de ocorrência
            no prazo máximo de 48 (quarenta e oito) horas com:
          </p>
          <p className="pl-4">
            a) preenchimento do relatório de avarias e/ou, aviso de sinistro da LOCADORA, mediante
            solicitação do documento;
          </p>
          <p className="pl-4">b) do Boletim de Ocorrência ou comprovante do seu protocolo;</p>
          <p className="pl-4">
            c) laudo pericial ou seu protocolo, quando houver capotamento do veículo ou vítima
            fatal.
          </p>
          <p>
            5.8. O(a) CONTRATANTE e a LOCADORA concordam que exclusivamente a manutenção por
            quaisquer avarias que ocorrer no veículo, independente de quem deu causa, será realizada
            na oficina {EMPRESA.oficinaCredenciada}.
          </p>
          <p>
            5.9. O(a) CONTRATANTE reconhece o dever de avisar a LOCADORA a cada 10.000km (dez mil)
            quilômetros rodados, para que assim seja realizada a revisão preventiva (troca de óleos
            e filtros) do veículo, que será de responsabilidade do CONTRATANTE tanto a marcação
            como o pagamento da revisão citada.
          </p>
          <p className="pl-4">
            5.9.1. Caso o(a) CONTRATANTE não respeite a cláusula anterior, será aplicada uma multa
            unilateral no valor de {valorMultaKm}, além de toda e qualquer outra cobrança que vier a
            dar prejuízo a LOCADORA.
          </p>
          <p>
            5.10. O(a) CONTRATANTE reconhece que as responsabilidades da LOCADORA limitam-se àquelas
            previstas na legislação brasileira, cabendo ao CONTRATANTE arcar com o ônus da sua
            conduta dolosa ou culposa, inclusive perante terceiros.
          </p>
          <p>
            5.11. O(a) CONTRATANTE obrigatoriamente será cadastrado como o principal condutor do
            veículo locado no sistema do Senatran até a devolução do mesmo. Sendo assim, o(a)
            CONTRATANTE fica ciente que é extremamente proibido se excluir desse cadastro, caso
            ocorra, o(a) CONTRATANTE terá o veículo imediatamente bloqueado e podendo ter seu
            contrato encerrado por quebra de contrato.
          </p>
          <p>
            5.12. Constatado defeito inerente ao mau uso pelo CONTRATANTE, ou que este tenha dado
            causa, o valor referente ao conserto será exclusivamente do CONTRATANTE.
          </p>
          <p>
            5.13. O CONTRATANTE se obriga a permanecer com o adesivo da LOCADORA no vidro traseiro do
            veículo, a retirada do mesmo gera multa e custo para recolocação, o CONTRATANTE arcará
            com o pagamento.
          </p>
        </Secao>

        <Secao titulo="Da Reparação, do Seguro e do Rastreamento">
          <p>
            6.1. O(a) CONTRATANTE tem ciência de que o veículo, objeto do presente contrato, possui
            uma Proteção veicular para cobertura em caso de FURTO, ROUBO, PERDA ou COLISÃO.
          </p>
          <p>
            6.2. O(a) CONTRATANTE será o responsável por quaisquer prejuízos inerentes ao mau uso do
            veículo, parciais ou totais, independentemente de culpabilidade, sendo compelido ao
            pagamento do reparo do mesmo, bem como o pagamento da locação até a efetiva liberação do
            veículo ou realizando o pagamento da &ldquo;franquia&rdquo; da Proteção veicular LOCADORA no valor
            de {valorFranquia}.
          </p>
          <p className="pl-4">
            6.2.1. Na ocorrência da cláusula supra, sendo o prejuízo causado por terceiro que não
            o(a) CONTRATANTE, caberá a este o direito de ser ressarcido através de ação regressiva
            autônoma contra quem deu causa, em âmbito judicial, estando a LOCADORA desobrigada em
            qualquer hipótese.
          </p>
          <p className="pl-4">
            6.2.2. Na hipótese do item anterior, a LOCADORA se compromete a fornecer a documentação
            necessária, caso o CONTRATANTE solicite, dentro do prazo de 7 (sete) dias úteis.
          </p>
          <p>6.3. Todos os veículos possuem rastreador, cuja gerência está sob os cuidados da LOCADORA.</p>
          <p>
            6.4. O(a) CONTRATANTE deverá arcar com os custos adicionais do reboque/guincho que
            venham a ocorrer para distâncias superiores a 300 km (trezentos quilômetros) da agência
            de retirada do veículo, que tomará como base para o cálculo da cobrança e taxa de
            retorno correspondente.
          </p>
        </Secao>

        <Secao titulo="Das Infrações de Trânsito">
          <p>
            7.1. O(a) CONTRATANTE concorda que a LOCADORA, sempre que julgar necessário, irá
            indicá-lo como condutor responsável pelas infrações de trânsito apuradas durante a
            locação, nos termos do artigo 257, parágrafos 1º, 3º, 7º e 8º do CTB. A partir da
            indicação, o CONTRATANTE terá legitimidade para se defender perante o órgão autuador.
          </p>
          <p className="pl-4">
            7.1.1. A LOCADORA irá informar o(a) CONTRATANTE sob a existência da infração, assim que
            tomar conhecimento da mesma, ficando o(a) CONTRATANTE obrigado(a) a assinar a indicação
            do condutor até 48h (quarenta e oito horas) após recebimento da notificação do condutor.
          </p>
          <p>
            7.2. Qualquer questionamento sobre eventual improcedência de multas de trânsito deverá
            ser feito pelo(a) CONTRATANTE exclusivamente perante o órgão autuador.
          </p>
          <p>
            7.3. O(a) CONTRATANTE reconhece que a LOCADORA, na condição de proprietária do veículo,
            autoriza expressamente a LOCADORA a efetuar a cobrança das multas, já com o repasse
            concedido pelo órgão de trânsito, acrescidas de {formatCurrency(EMPRESA.custoAdministrativoMulta)}{" "}
            a título de custo administrativo.
          </p>
          <p className="pl-4">
            7.3.1. A LOCADORA se compromete a enviar ao CONTRATANTE todos os AIT (Auto de Infrações)
            com valores e a data limite para pagamento dos mesmos.
          </p>
          <p className="pl-4">
            7.3.2. Caso não haja o pagamento da multa (AIT) para LOCADORA até prazo limite o veículo
            será bloqueado até pagamento.
          </p>
          <p>
            7.4. Se o(a) CONTRATANTE optar por recorrer da autuação e, sendo o recurso vitorioso, a
            LOCADORA lhe fornecerá cópia da guia de pagamento para que ele solicite ao órgão o
            reembolso.
          </p>
          <p>
            7.5. O(a) CONTRATANTE se obriga a ressarcir a LOCADORA por todos os valores relativos às
            infrações de trânsito ocorridas durante a locação, mesmo que a LOCADORA não seja
            notificada dentro do prazo legal.
          </p>
          <p>
            7.6. No caso do(a) CONTRATANTE não ressarcir ou arcar com os valores relativos a
            infrações de trânsito, ficará esta responsabilizada por eventuais custos judiciais, bem
            como arcar com uma multa ou o pagamento dobrado nos termos legais.
          </p>
          <p className="pl-4">
            7.6.1. No caso do inadimplemento do(a) CONTRATANTE se dar de forma dolosa, ficará este,
            também, responsável em indenizar moralmente a LOCADORA.
          </p>
          <p>7.7. O(a) CONTRATANTE não poderá utilizar-se da caução como opção para quitar a multa de trânsito.</p>
        </Secao>

        <Secao titulo="Das Comunicações e Bloqueios">
          <p>
            8.1. Fica estabelecido que, entre o(a) CONTRATANTE e a LOCADORA, será utilizado como
            &ldquo;meio&rdquo; principal de comunicação, prestação de informações, cobrança e troca de
            documentos, o aplicativo &ldquo;Grupo WhatsApp&rdquo;.
          </p>
          <p>8.2. O veículo locado poderá ser bloqueado nas seguintes situações:</p>
          <p className="pl-4">Inadimplemento da Locação;</p>
          <p className="pl-4">Inadimplemento de Acordos vinculados a Locação;</p>
          <p className="pl-4">Inadimplemento de Multas.</p>
        </Secao>

        <Secao titulo="Devolução">
          <p>9.1. O CONTRATANTE deverá devolver o veículo no mesmo estado que foi entregue no item 4.1.</p>
          <p className="pl-4">9.1.1. Segue tabela com itens que podem ser cobrados de imediato:</p>
          {EMPRESA.itensDevolucao.map((item) => (
            <p key={item.descricao} className="pl-8">
              - {item.descricao} {item.valor}
            </p>
          ))}
          <p>9.2. A revisão preventiva do veículo será cobrada proporcionalmente conforme item 5.9.</p>
        </Secao>

        <Secao titulo="Da Proteção de Dados e Anticorrupção">
          <p>
            10.1. Nos termos da legislação brasileira geral de proteção de dados, as partes são
            obrigadas a manter em sigilo todas as informações relacionadas entre as mesmas, às quais
            as partes tenham acesso durante o período de vigência deste, perdurando esta
            confidencialidade mesmo após o término, rescisão ou extinção do presente instrumento.
          </p>
          <p>
            10.2. As partes estão cientes de que caso seja constatado tratamento irregular de dados
            pessoais, a responsabilidade será atribuída exclusivamente para aquela que causar o
            dano, seja indireto ou direto, sob pena de reparação na forma do art. 927 c/c 186 do
            Código Civil.
          </p>
          <p>
            10.3. Os direitos e obrigações descritos neste instrumento não poderão ser transferidos
            pelas partes em favor de terceiros em qualquer hipótese.
          </p>
          <p>
            10.4. Pelo presente instrumento, as partes comprometem-se a observar e cumprir todas as
            normas legais cabíveis, incluindo, mas não se limitando à legislação brasileira
            anticorrupção e a legislação brasileira contra a lavagem de dinheiro, bem como declaram
            não estarem envolvidas e/ou se envolverão, direta ou indiretamente, por meio de seus
            representantes ou qualquer preposto, em qualquer atividade ou prática que constitua uma
            infração às referidas leis.
          </p>
        </Secao>

        <Secao titulo="Das Disposições Finais e do Foro">
          <p>
            11.1. O presente foi lido pelo(a) CONTRATANTE, pelo qual declara que o mesmo é assinado
            sem vícios, coação ou dolo, e que não pode ser alterado total ou parcialmente sem a
            anuência das partes, nos termos do art. 784, inciso III, do CPC.
          </p>
          <p>
            11.2. As partes comprometem-se a observar e cumprir todas as normas legais cabíveis,
            incluindo, mas não se limitando à legislação brasileira anticorrupção e a legislação
            brasileira contra lavagem de dinheiro, bem como declaram não estarem envolvidas e/ou se
            envolverem, direta ou indiretamente, em qualquer atividade ou prática que constitua uma
            infração às referidas leis.
          </p>
          <p>
            11.3. Para dirimir qualquer dúvida oriunda deste instrumento fica eleito o foro da
            comarca de {EMPRESA.foro}, com exclusão de qualquer outro por mais privilegiado que
            seja.
          </p>
        </Secao>

        <p className="mt-4 mb-8">
          E por estarem assim justos e contratados, assinam o presente instrumento elaborado em 2
          (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas, para que surta
          seus efeitos legais, obrigando-se por si, seus herdeiros e/ou sucessores, ao fiel
          cumprimento de todas as suas cláusulas e condições.
        </p>

        <p className="mb-10">{EMPRESA.foro}, {formatDate(contrato.dataInicio)}</p>

        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="mb-1 border-t border-neutral-900 pt-1">LOCADORA</div>
            <p>{EMPRESA.razaoSocial}</p>
            <p>CNPJ nº {EMPRESA.cnpj}</p>
          </div>
          <div>
            <div className="mb-1 border-t border-neutral-900 pt-1">CONTRATANTE</div>
            <p>Nome: {cliente.nome.toUpperCase()}</p>
            <p>CPF: {formatDocument(cliente.documento)}</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-neutral-500">
          <div className="border-t border-neutral-400 pt-1">Testemunha 1</div>
          <div className="border-t border-neutral-400 pt-1">Testemunha 2</div>
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

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="inline text-neutral-500">{label}: </dt>
      <dd className="inline font-medium">{valor}</dd>
    </div>
  );
}
