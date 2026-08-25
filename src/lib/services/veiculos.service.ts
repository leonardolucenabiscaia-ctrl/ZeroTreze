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

export async function listarVeiculosEmManutencao(): Promise<Veiculo[]> {
  return apiFetch<Veiculo[]>("/api/veiculos?emManutencao=true");
}

export async function colocarVeiculoEmManutencao(
  veiculoId: string,
  tipo: "mecanica" | "funilaria"
): Promise<Veiculo> {
  return apiFetch<Veiculo>(`/api/veiculos/${veiculoId}/manutencao`, {
    method: "POST",
    body: JSON.stringify({ tipo }),
  });
}

export async function retirarVeiculoDeManutencao(veiculoId: string): Promise<Veiculo> {
  return apiFetch<Veiculo>(`/api/veiculos/${veiculoId}/manutencao`, { method: "DELETE" });
}

export async function listarVeiculosIndisponiveis(): Promise<Veiculo[]> {
  return apiFetch<Veiculo[]>("/api/veiculos?indisponiveis=true");
}

/** Pausa temporária decidida pela equipe (reservado, aguardando limpeza/documentação etc.) —
 * independente de bloqueio (geralmente por problema) e de manutenção (mecânica/funilaria). */
export async function marcarVeiculoIndisponivel(veiculoId: string): Promise<Veiculo> {
  return apiFetch<Veiculo>(`/api/veiculos/${veiculoId}/indisponivel`, { method: "POST" });
}

export async function marcarVeiculoDisponivel(veiculoId: string): Promise<Veiculo> {
  return apiFetch<Veiculo>(`/api/veiculos/${veiculoId}/indisponivel`, { method: "DELETE" });
}

export async function atualizarVeiculo(veiculoId: string, dados: Partial<Veiculo>): Promise<Veiculo> {
  return apiFetch<Veiculo>(`/api/veiculos/${veiculoId}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

/** A quilometragem só pode subir — o servidor rejeita valores menores que o atual. */
export async function atualizarQuilometragem(veiculoId: string, quilometragem: number): Promise<Veiculo> {
  return apiFetch<Veiculo>(`/api/veiculos/${veiculoId}/quilometragem`, {
    method: "POST",
    body: JSON.stringify({ quilometragem }),
  });
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
  quilometragem: number;
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
  formData.append("quilometragem", String(dados.quilometragem));
  dados.anexos.forEach((arquivo) => formData.append("anexos", arquivo));
  if (dados.foto) formData.append("foto", dados.foto);

  return apiFetch<Veiculo>("/api/veiculos", { method: "POST", body: formData });
}
