/** Fotos reais disponíveis por marca+modelo, tratadas com fundo preto (identidade premium). */
const FOTOS: Record<string, string> = {
  "fiat|argo": "/mock/veiculos/fiat-argo.jpg",
  "toyota|corolla cross": "/mock/veiculos/toyota-corolla-cross.jpg",
  "toyota|corolla": "/mock/veiculos/toyota-corolla.jpg",
  "renault|duster": "/mock/veiculos/renault-duster.jpg",
  "hyundai|creta": "/mock/veiculos/hyundai-creta.jpg",
  "chevrolet|onix": "/mock/veiculos/chevrolet-onix.jpg",
  "volkswagen|polo": "/mock/veiculos/volkswagen-polo.jpg",
  "volkswagen|saveiro": "/mock/veiculos/volkswagen-saveiro.jpg",
  "chevrolet|spin": "/mock/veiculos/chevrolet-spin.jpg",
  "volkswagen|t-cross": "/mock/veiculos/volkswagen-t-cross.jpg",
  "hyundai|tucson": "/mock/veiculos/hyundai-tucson.jpg",
  "volkswagen|nivus": "/mock/veiculos/volkswagen-nivus.jpg",
  "chevrolet|s10": "/mock/veiculos/chevrolet-s10.jpg",
  "fiat|toro": "/mock/veiculos/fiat-toro.jpg",
  "toyota|yaris": "/mock/veiculos/toyota-yaris.jpg",
};

const PLACEHOLDER = "/mock/veiculos/placeholder.svg";

export function fotoDoVeiculo(marca: string, modelo: string): string {
  const chave = `${marca.trim().toLowerCase()}|${modelo.trim().toLowerCase()}`;
  return FOTOS[chave] ?? PLACEHOLDER;
}
