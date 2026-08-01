export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export interface MapsProvider {
  obterLocalizacaoAtual(): Promise<Coordenadas>;
}

/**
 * A captura de localização usa a Geolocation API real do navegador — não é mock.
 * TODO(integração real): usar `latitude`/`longitude` para consultar Google Maps,
 * Waze ou OpenStreetMap e calcular distância/rota até a equipe de assistência.
 */
const browserGeolocationProvider: MapsProvider = {
  obterLocalizacaoAtual() {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        reject(new Error("Geolocalização indisponível neste dispositivo"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  },
};

export const mapsProvider: MapsProvider = browserGeolocationProvider;
