#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Corrige ultra-map/index.html (modo "discover" = explore nearby):

1. loadNearbyProviders() apontava pra /api/v1/providers/nearby (rota que
   não existe) — corrige pra /api/v1/monetization/providers/nearby.
2. Param errado: radius=10 -> radiusKm=10 (nome real esperado pelo backend).
3. Resposta do backend é {providers:[...], count} e não um array direto
   em `data` — corrige o parsing.
4. Campos errados: p.lat/p.lng/p.rating -> p.latitude/p.longitude/p.ratingAvg
   (nomes reais retornados pela API).
5. Ícone por vertical (🔧 oficina, 🚚 logística, 🚗 locadora) em vez de
   🔧 fixo pra tudo.
6. Adiciona refresh automático via 'moveend' quando o modo discover está
   ativo (com debounce de 600ms), já que antes só carregava 1x ao trocar
   de pílula e nunca mais ao arrastar o mapa.

Idempotente: se o marcador já existir, não faz nada.
"""

PATH = "ultra-map/index.html"
MARKER = "// MOBYA-PATCH: explore-nearby-fix"

OLD_FUNCTION = """// Carrega prestadores reais da API quando modo discover ativar
async function loadNearbyProviders() {
  try {
    if (!map.getSource('providers')) return;
    const center = map.getCenter();
    let url = `${API_BASE}/api/v1/providers/nearby?lat=${center.lat}&lng=${center.lng}&radius=10`;
    const token = getAuthToken();
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(r.statusText);
    const { data } = await r.json();
    if (!data?.length) { showToast('ℹ️ Nenhum prestador próximo'); return; }
    const geojson = {
      type: 'FeatureCollection',
      features: data.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { type: '🔧', name: p.name, rating: p.rating || 0 },
      })),
    };
    map.getSource('providers').setData(geojson);
    showToast(`📍 ${data.length} prestadores carregados`);
  } catch (e) {
    console.warn('[UltraMap] Não foi possível carregar prestadores:', e.message);
    // fallback: deixa cluster vazio, sem travar nada
  }
}"""

NEW_FUNCTION = """// MOBYA-PATCH: explore-nearby-fix
// Carrega prestadores reais da API quando modo discover ativar.
// Rota pública (sem auth) — qualquer visitante pode descobrir
// parceiros próximos no mapa.
const VERTICAL_ICON = { SERVICE: '🔧', LOGISTICS: '🚚', RENTAL: '🚗', FLEET_RENTAL: '🚗', INSURANCE: '🛡️', FINANCING: '💳', CONSORTIUM: '🤝', PARTS: '⚙️' };

async function loadNearbyProviders() {
  try {
    if (!map.getSource('providers')) return;
    const center = map.getCenter();
    const url = `${API_BASE}/api/v1/monetization/providers/nearby?lat=${center.lat}&lng=${center.lng}&radiusKm=10`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.statusText);
    const { data } = await r.json();
    const providers = data?.providers || [];
    if (!providers.length) { showToast('ℹ️ Nenhum prestador próximo'); return; }
    const geojson = {
      type: 'FeatureCollection',
      features: providers.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: { type: VERTICAL_ICON[p.vertical] || '📍', name: p.name, rating: p.ratingAvg || 0 },
      })),
    };
    map.getSource('providers').setData(geojson);
    showToast(`📍 ${providers.length} prestadores carregados`);
  } catch (e) {
    console.warn('[UltraMap] Não foi possível carregar prestadores:', e.message);
    // fallback: deixa cluster vazio, sem travar nada
  }
}

// Refresca a lista ao arrastar/zoom o mapa no modo discover (debounce 600ms)
let _nearbyDebounce = null;
function _scheduleNearbyRefresh() {
  if (currentMode !== 'discover') return;
  clearTimeout(_nearbyDebounce);
  _nearbyDebounce = setTimeout(loadNearbyProviders, 600);
}"""

MOVEEND_HOOK_MARKER = "map.on('moveend', _scheduleNearbyRefresh);"
MOVEEND_HOOK_ANCHOR = "function initMap(token) {"


def main():
    with open(PATH, "r", encoding="utf-8") as f:
        src = f.read()

    if MARKER in src:
        print(f"OK: patch já aplicado em {PATH} — nada a fazer (idempotente).")
        return

    if OLD_FUNCTION not in src:
        raise SystemExit(
            "ERRO: função loadNearbyProviders() original não encontrada exatamente "
            "como esperado — arquivo pode ter mudado. Abortando sem tocar em nada."
        )

    src = src.replace(OLD_FUNCTION, NEW_FUNCTION, 1)

    # Adiciona a chamada map.on('moveend', ...) dentro de initMap, sem precisar
    # achar a chave de fechamento exata — insere logo após a criação do mapa,
    # procurando o primeiro '});' que fecha o `new mapboxgl.Map({...})`.
    if MOVEEND_HOOK_MARKER not in src:
        idx = src.find(MOVEEND_HOOK_ANCHOR)
        if idx == -1:
            raise SystemExit("ERRO: anchor 'function initMap' não encontrado. Abortando sem tocar em nada.")
        # acha o map.on('load', ...) já existente (sabemos que existe, é onde
        # apply3DBuildings/addClusterLayer são chamados) e insere depois dele
        load_anchor = "map.on('load', () => {"
        load_idx = src.find(load_anchor, idx)
        if load_idx == -1:
            raise SystemExit("ERRO: anchor \"map.on('load', () => {\" não encontrado dentro de initMap. Abortando.")
        insertion_point = load_idx + len(load_anchor)
        src = src[:insertion_point] + "\n  " + MOVEEND_HOOK_MARKER + src[insertion_point:]

    with open(PATH, "w", encoding="utf-8") as f:
        f.write(src)

    print(f"OK: loadNearbyProviders() corrigida + refresh automático no moveend em {PATH}")


if __name__ == "__main__":
    main()
