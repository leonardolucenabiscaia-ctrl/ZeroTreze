import type { Veiculo } from "@/lib/types";
import { apiFetch } from "./api-client";

export async function listarVeiculos(): Promise<Veiculo[]> {
  return apiFetch<Veiculo[]>("/api/veiculos");
}

export async function buscarVeiculoPorId(id: string): Promise<Veiculo | undefined> {
  return apiFetch<Veiculo | null>(`/api/veiculos/${id}`).then((v) => v ?? undefined);
}

export async function listarVeiculosBloqueados(): Promise<Veiculo[]> {
  return apiFetch<Veiculo[]>("/api/veiculos?bloqueados=true");
}

/** Bloqueia o veículo — o contrato vinculado continua rodando normalmente, só o carro fica
 * impedido de uso. */
export async function bloquearVeiculo(veiculoId: string): Promise<Veiculo> {
  return apiFetch<Veiculo>(`/api/veiculos/${veiculoId}/bloquear`, { method: "POST" });
}

export async function desbloquearVeiculo(veiculoId: string): Promise<Veiculo> {
  return apiFetch<Veiculo>(`/api/veiculos/${veiculoId}/desbloquear`, { method: "POST" });
}

export interface NovoVeiculoInput {
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  cor: string;
  renavam: string;
  chassi: string;
  categoria: string;
  combustivel: string;
  anexos: File[];
  foto?: File;
}

export async function criarVeiculo(dados: NovoVeiculoInput): Promise<Veiculo> {
  const formData = new FormData();
  formData.append("marca", dados.marca);
  formData.append("modelo", dados.modelo);
  formData.append("ano", String(dados.ano));
  formData.append("placa", dados.placa);
  formData.append("cor", dados.cor);
  formData.append("renavam", dados.renavam);
  formData.append("chassi", dados.chassi);
  formData.append("categoria", dados.categoria);
  formData.append("combustivel", dados.combustivel);
  dados.anexos.forEach((arquivo) => formData.append("anexos", arquivo));
  if (dados.foto) formData.append("foto", dados.foto);

  return apiFetch<Veiculo>("/api/veiculos", { method: "POST", body: formData });
}
