"use client";

import * as React from "react";
import { Battery, CheckCircle2, ClipboardList, Disc3, Gauge, PaintBucket, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/shared/file-uploader";
import {
  atualizarChecklistContrato,
  listarAnexosChecklistContrato,
  type ChecklistContratoInput,
} from "@/lib/services/contratos.service";
import { abrirDocumento } from "@/lib/services/documentos.service";
import { formatDateTime } from "@/lib/utils/formatters";
import type { ChecklistContrato, Documento } from "@/lib/types";

/** `null` = ainda não respondido — o botão de salvar só habilita com os 4 itens decididos. */
type RespostaItem = boolean | null;

const ITENS: { chave: "pneus" | "odometro" | "lataria" | "bateria"; label: string; icon: typeof Disc3 }[] = [
  { chave: "pneus", label: "Pneus", icon: Disc3 },
  { chave: "odometro", label: "Odômetro", icon: Gauge },
  { chave: "lataria", label: "Lataria", icon: PaintBucket },
  { chave: "bateria", label: "Bateria", icon: Battery },
];

function BotoesDeAcordo({
  valor,
  onChange,
}: {
  valor: RespostaItem;
  onChange: (valor: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={valor === true ? "default" : "outline"}
        onClick={() => onChange(true)}
      >
        <CheckCircle2 className="size-4" />
        De acordo
      </Button>
      <Button
        type="button"
        size="sm"
        variant={valor === false ? "destructive" : "outline"}
        onClick={() => onChange(false)}
      >
        <XCircle className="size-4" />
        Não
      </Button>
    </div>
  );
}

export function ChecklistContratoCard({
  contratoId,
  checklist,
  onSalvo,
}: {
  contratoId: string;
  checklist?: ChecklistContrato;
  onSalvo: (checklist: ChecklistContrato) => void;
}) {
  const [pneusOk, setPneusOk] = React.useState<RespostaItem>(checklist?.pneusOk ?? null);
  const [odometroOk, setOdometroOk] = React.useState<RespostaItem>(checklist?.odometroOk ?? null);
  const [odometroKm, setOdometroKm] = React.useState(
    checklist?.odometroKm !== undefined ? String(checklist.odometroKm) : ""
  );
  const [latariaOk, setLatariaOk] = React.useState<RespostaItem>(checklist?.latariaOk ?? null);
  const [bateriaOk, setBateriaOk] = React.useState<RespostaItem>(checklist?.bateriaOk ?? null);
  const [observacao, setObservacao] = React.useState(checklist?.observacao ?? "");
  const [novosAnexos, setNovosAnexos] = React.useState<File[]>([]);
  const [anexosSalvos, setAnexosSalvos] = React.useState<Documento[] | null>(null);
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    listarAnexosChecklistContrato(contratoId).then(setAnexosSalvos);
  }, [contratoId]);

  const respostas = { pneusOk, odometroOk, latariaOk, bateriaOk };
  const todasRespondidas = Object.values(respostas).every((v) => v !== null);
  const odometroKmNumero = Number(odometroKm);
  const odometroValido = odometroKm.trim() !== "" && odometroKmNumero >= 0;
  const podeSalvar = todasRespondidas && odometroValido && !salvando;

  async function handleSalvar() {
    if (!podeSalvar || pneusOk === null || odometroOk === null || latariaOk === null || bateriaOk === null) return;
    setSalvando(true);
    try {
      const dados: ChecklistContratoInput = {
        pneusOk,
        odometroOk,
        odometroKm: odometroKmNumero,
        latariaOk,
        bateriaOk,
        observacao: observacao.trim() || undefined,
      };
      const atualizado = await atualizarChecklistContrato(contratoId, dados, novosAnexos);
      if (atualizado.checklist) onSalvo(atualizado.checklist);
      if (novosAnexos.length > 0) {
        setNovosAnexos([]);
        listarAnexosChecklistContrato(contratoId).then(setAnexosSalvos);
      }
      toast.success("Checklist salvo com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o checklist.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ClipboardList className="size-4 text-gold" />
          Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {checklist && (
          <p className="text-xs text-muted-foreground">
            Última atualização por {checklist.atualizadoPorNome} em {formatDateTime(checklist.atualizadoEm)}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {ITENS.map(({ chave, label, icon: Icon }) => (
            <div key={chave} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="size-4 text-gold" />
                {label}
              </Label>
              {chave === "pneus" && <BotoesDeAcordo valor={pneusOk} onChange={setPneusOk} />}
              {chave === "lataria" && <BotoesDeAcordo valor={latariaOk} onChange={setLatariaOk} />}
              {chave === "bateria" && <BotoesDeAcordo valor={bateriaOk} onChange={setBateriaOk} />}
              {chave === "odometro" && (
                <div className="flex flex-col gap-2">
                  <BotoesDeAcordo valor={odometroOk} onChange={setOdometroOk} />
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    placeholder="Quilometragem (km)"
                    value={odometroKm}
                    onChange={(e) => setOdometroKm(e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checklist-observacao" className="text-xs">
            Observação / ponto de atenção
          </Label>
          <Textarea
            id="checklist-observacao"
            placeholder="Ex.: pequeno amassado na porta traseira esquerda"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
          />
        </div>

        {anexosSalvos && anexosSalvos.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Anexos já salvos</span>
            <ul className="flex flex-col gap-1.5">
              {anexosSalvos.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() =>
                      abrirDocumento(doc.id).catch((error) =>
                        toast.error(error instanceof Error ? error.message : "Não foi possível abrir o documento.")
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-sm hover:bg-secondary/70"
                  >
                    <span className="truncate text-foreground underline-offset-2 hover:underline">{doc.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <FileUploader
          arquivos={novosAnexos}
          onChange={setNovosAnexos}
          label="Anexos"
          hint="Fotos ou documentos da vistoria — arraste ou clique para selecionar"
        />

        <Button onClick={handleSalvar} disabled={!podeSalvar}>
          {salvando ? "Salvando…" : "Salvar checklist"}
        </Button>
      </CardContent>
    </Card>
  );
}
