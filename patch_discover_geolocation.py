#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Corrige ultra-map/index.html: modo "discover" nunca usava a localização
real do visitante (navigator.geolocation nunca era chamado) — sempre
centrava num ponto fixo em São Paulo e carregava sempre os mesmos
prestadores fixos, independente de onde o usuário estivesse.

Agora, ao entrar no modo discover:
  1. Pede navigator.geolocation.getCurrentPosition (com timeout de 8s).
  2. Se conseguir, centra o mapa na posição real e SÓ ENTÃO chama
     loadNearbyProviders() (que lê o centro do mapa).
  3. Se o usuário negar permissão, o navegador não suportar, ou der
     timeout, cai no fallback do centro fixo de SP que já existia —
     sem travar a experiência.

Idempotente: se o marcador já existir, não faz nada.
"""

PATH = "ultra-map/index.html"
MARKER = "// MOBYA-PATCH: discover-real-geolocation"

OLD_BLOCK = """  if (mode === 'discover') {
    map.easeTo({ zoom: 12.5, pitch: 20, duration: 800 });
    if (!showHeat) toggleHeat();
    ['clusters','cluster-count','unclustered-point','unclustered-icon'].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
    });
    loadNearbyProviders();
    showToast('🔍 Prestadores próximos');
  } else if (mode === 'tracking') {"""

NEW_BLOCK = """  if (mode === 'discover') {
    // MOBYA-PATCH: discover-real-geolocation
    // Antes o mapa nunca pedia a posição real do visitante — sempre
    // centrava num ponto fixo de SP. Agora pede geolocalização real
    // do navegador e só então busca prestadores próximos dali.
    map.easeTo({ zoom: 12.5, pitch: 20, duration: 800 });
    if (!showHeat) toggleHeat();
    ['clusters','cluster-count','unclustered-point','unclustered-icon'].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
    });
    _centerOnRealLocationThenLoad();
  } else if (mode === 'tracking') {"""

NEW_HELPER = """
// MOBYA-PATCH: discover-real-geolocation
// Pede a localização real do navegador pra centrar o modo discover.
// Fallback silencioso pro centro fixo de SP se negar/falhar/timeout.
function _centerOnRealLocationThenLoad() {
  if (!navigator.geolocation) {
    showToast('🔍 Prestadores próximos (localização indisponível)');
    loadNearbyProviders();
    return;
  }
  showToast('📡 Obtendo sua localização...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      map.easeTo({ center: [longitude, latitude], zoom: 13, duration: 800 });
      showToast('🔍 Prestadores próximos da sua localização');
      // espera a câmera assentar antes de buscar (loadNearbyProviders lê o centro atual do mapa)
      setTimeout(loadNearbyProviders, 850);
    },
    (err) => {
      console.warn('[UltraMap] Geolocalização negada/indisponível:', err.message);
      showToast('🔍 Prestadores próximos (usando região padrão)');
      loadNearbyProviders();
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}
"""

SETMODE_ANCHOR = "function setMode(mode) {"


def main():
    with open(PATH, "r", encoding="utf-8") as f:
        src = f.read()

    if MARKER in src:
        print(f"OK: patch já aplicado em {PATH} — nada a fazer (idempotente).")
        return

    if OLD_BLOCK not in src:
        raise SystemExit(
            "ERRO: bloco original do modo discover não encontrado exatamente "
            "como esperado — arquivo pode ter mudado. Abortando sem tocar em nada."
        )
    if SETMODE_ANCHOR not in src:
        raise SystemExit("ERRO: anchor 'function setMode' não encontrado. Abortando sem tocar em nada.")

    src = src.replace(OLD_BLOCK, NEW_BLOCK, 1)
    # injeta o helper logo antes da função setMode
    src = src.replace(SETMODE_ANCHOR, NEW_HELPER.strip() + "\n\n" + SETMODE_ANCHOR, 1)

    with open(PATH, "w", encoding="utf-8") as f:
        f.write(src)

    print(f"OK: modo discover agora usa geolocalização real do navegador em {PATH}")


if __name__ == "__main__":
    main()
