#!/usr/bin/env python3
"""
Patch Fase 4B — UI Dispatch para Prestador
- Conecta ao namespace /dispatch via Socket.io
- Recebe dispatch_offer e exibe modal com countdown 15s
- Botões Aceitar / Rejeitar chamam API REST
- dispatch_timeout fecha modal automaticamente
- dispatch_taken notifica "já foi atendido"
- Integrado ao módulo window.GPSTracking existente

USO:
  cd ~/mobya-master
  python3 patch_dispatch_fase4b.py
  git add -A && git commit -m "feat: dispatch fase4b UI prestador aceitar/rejeitar" && git push
"""
import os

ROOT = os.getcwd()

def w(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[OK] escrito: {path}")

DISPATCH_JS = r"""
// ══════════════════════════════════════════════════════════════
// MOBYA — Dispatch UI (Fase 4B)
// Prestador recebe ofertas em tempo real via Socket.io /dispatch
// ══════════════════════════════════════════════════════════════
window.DispatchUI = (() => {
  const API_BASE = (window.MOBYA?.API || 'https://mobya.onrender.com') + '/api/v1';
  const WS_BASE  = API_BASE.replace('/api/v1','').replace('https://','wss://').replace('http://','ws://');

  let dispatchSocket = null;
  let countdownTimer = null;
  let currentOffer   = null;

  const OFFER_TIMEOUT_MS = 15000;

  // ── Estilos do modal ──────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('dispatch-styles')) return;
    const s = document.createElement('style');
    s.id = 'dispatch-styles';
    s.textContent = `
      #dispatch-overlay {
        position:fixed;inset:0;z-index:9999;
        background:rgba(0,0,0,.75);
        display:flex;align-items:center;justify-content:center;
        animation:dp-fadein .2s ease;
      }
      @keyframes dp-fadein{from{opacity:0}to{opacity:1}}
      #dispatch-modal {
        background:var(--card-bg,#1a1a2e);
        border:1px solid var(--border,rgba(255,255,255,.1));
        border-radius:16px;width:calc(100% - 32px);max-width:380px;
        padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.6);
      }
      #dispatch-modal h2 {
        font-family:'Bebas Neue',sans-serif;font-size:1.5rem;
        letter-spacing:2px;color:var(--q4,#f59e0b);margin:0 0 4px;
      }
      #dispatch-modal .dp-type {
        font-size:.8rem;color:var(--muted,#888);margin-bottom:14px;
      }
      #dispatch-modal .dp-info {
        background:rgba(255,255,255,.05);border-radius:10px;
        padding:12px;margin-bottom:14px;font-size:.85rem;line-height:1.6;
      }
      #dispatch-modal .dp-info strong { color:var(--text,#fff); }
      #dispatch-modal .dp-info span   { color:var(--muted,#888); }
      #dispatch-countdown {
        text-align:center;font-size:2rem;font-weight:700;
        color:var(--q4,#f59e0b);margin-bottom:4px;
        font-family:'Bebas Neue',monospace;letter-spacing:2px;
      }
      #dispatch-countdown.urgent { color:#ef4444; }
      #dispatch-prog-wrap {
        height:4px;background:rgba(255,255,255,.1);border-radius:2px;
        margin-bottom:16px;overflow:hidden;
      }
      #dispatch-prog {
        height:100%;background:var(--q4,#f59e0b);
        transition:width .9s linear;border-radius:2px;
      }
      .dp-btns { display:flex;gap:10px; }
      .dp-btn-accept {
        flex:1;padding:12px;border-radius:10px;border:none;cursor:pointer;
        background:linear-gradient(135deg,#10b981,#059669);
        color:#fff;font-weight:700;font-size:.95rem;
        transition:opacity .15s;
      }
      .dp-btn-accept:active { opacity:.8; }
      .dp-btn-reject {
        flex:1;padding:12px;border-radius:10px;border:none;cursor:pointer;
        background:rgba(239,68,68,.15);color:#ef4444;
        border:1px solid rgba(239,68,68,.35);font-weight:600;font-size:.95rem;
        transition:opacity .15s;
      }
      .dp-btn-reject:active { opacity:.8; }
      #dispatch-badge {
        position:fixed;top:14px;right:14px;z-index:8888;
        background:var(--q4,#f59e0b);color:#000;
        border-radius:20px;padding:6px 14px;font-size:.78rem;
        font-weight:700;display:none;cursor:pointer;
        box-shadow:0 2px 12px rgba(245,158,11,.5);
        animation:dp-pulse 1.5s infinite;
      }
      @keyframes dp-pulse {
        0%,100%{transform:scale(1)}50%{transform:scale(1.05)}
      }
    `;
    document.head.appendChild(s);
  }

  // ── Renderiza modal de oferta ─────────────────────────────
  function _showOffer(offer) {
    _clearModal();
    currentOffer = offer;

    const overlay = document.createElement('div');
    overlay.id = 'dispatch-overlay';

    const typeLabels = {
      TOW:'🚛 Reboque', LOCKSMITH:'🔑 Chaveiro', FLAT_TIRE:'🔧 Pneu Furado',
      BATTERY:'🔋 Bateria', FUEL:'⛽ Combustível', ACCIDENT:'🚨 Acidente',
      OVERHEAT:'🌡️ Superaquecimento', FREIGHT:'📦 Frete',
      MECHANIC:'🔩 Mecânico', OTHER:'🛠️ Outro',
    };

    overlay.innerHTML = `
      <div id="dispatch-modal">
        <h2>⚡ NOVA OFERTA</h2>
        <div class="dp-type">${typeLabels[offer.type] || offer.type}</div>
        <div class="dp-info">
          ${offer.address ? `<div><span>📍 Local: </span><strong>${offer.address}</strong></div>` : ''}
          ${offer.estimatedCost ? `<div><span>💰 Estimativa: </span><strong>R$ ${Number(offer.estimatedCost).toFixed(2)}</strong></div>` : ''}
          ${offer.latitude && offer.longitude
            ? `<div><span>🗺️ Coords: </span><strong>${Number(offer.latitude).toFixed(5)}, ${Number(offer.longitude).toFixed(5)}</strong></div>`
            : ''}
        </div>
        <div id="dispatch-countdown">15</div>
        <div id="dispatch-prog-wrap"><div id="dispatch-prog" style="width:100%"></div></div>
        <div class="dp-btns">
          <button class="dp-btn-accept" onclick="DispatchUI.accept()">✅ Aceitar</button>
          <button class="dp-btn-reject" onclick="DispatchUI.reject()">❌ Rejeitar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Toca som de alerta se disponível
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 150, 300].forEach(delay => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880;
        g.gain.setValueAtTime(.3, ctx.currentTime + delay/1000);
        g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + delay/1000 + .15);
        o.start(ctx.currentTime + delay/1000);
        o.stop(ctx.currentTime + delay/1000 + .15);
      });
    } catch {}

    // Countdown visual
    const totalMs = offer.timeoutMs || OFFER_TIMEOUT_MS;
    const startTs = Date.now();
    const cdEl    = document.getElementById('dispatch-countdown');
    const progEl  = document.getElementById('dispatch-prog');

    countdownTimer = setInterval(() => {
      const elapsed = Date.now() - startTs;
      const rem     = Math.max(0, totalMs - elapsed);
      const secs    = Math.ceil(rem / 1000);
      if (cdEl) {
        cdEl.textContent = secs;
        cdEl.classList.toggle('urgent', secs <= 5);
      }
      if (progEl) progEl.style.width = ((rem / totalMs) * 100).toFixed(1) + '%';
      if (rem <= 0) _timeoutModal();
    }, 500);
  }

  function _clearModal() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    currentOffer   = null;
    document.getElementById('dispatch-overlay')?.remove();
  }

  function _timeoutModal() {
    _clearModal();
    if (typeof Toast !== 'undefined') Toast.show('⏱️ Tempo esgotado — oferta expirada.', 'warn');
  }

  // ── Aceitar oferta ────────────────────────────────────────
  async function accept() {
    if (!currentOffer) return;
    const { emergencyId } = currentOffer;
    _clearModal();
    try {
      const r = await API.req('POST', `/emergency/${emergencyId}/accept-offer`);
      if (r?.success) {
        if (typeof Toast !== 'undefined') Toast.show('✅ Oferta aceita! Abra o GPS Tracking para iniciar.', 'ok');
        // Abre tracking automaticamente se possível
        if (typeof App !== 'undefined') App.navigate('gps-tracking');
      } else {
        if (typeof Toast !== 'undefined') Toast.show(r?.error?.message || 'Oferta indisponível.', 'error');
      }
    } catch (e) {
      if (typeof Toast !== 'undefined') Toast.show('Erro ao aceitar oferta.', 'error');
    }
  }

  // ── Rejeitar oferta ───────────────────────────────────────
  async function reject() {
    if (!currentOffer) return;
    const { emergencyId } = currentOffer;
    _clearModal();
    try {
      await API.req('POST', `/emergency/${emergencyId}/reject-offer`);
      if (typeof Toast !== 'undefined') Toast.show('Oferta rejeitada.', 'info');
    } catch {}
  }

  // ── Conecta ao namespace /dispatch ───────────────────────
  function connect() {
    const token = typeof API !== 'undefined' ? API.getToken() : null;
    if (!token) return;
    if (dispatchSocket?.connected) return;

    _injectStyles();

    // Badge de status de conexão dispatch
    let badge = document.getElementById('dispatch-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'dispatch-badge';
      badge.textContent = '📡 Aguardando ofertas';
      badge.onclick = () => { badge.style.display = 'none'; };
      document.body.appendChild(badge);
    }

    dispatchSocket = io(WS_BASE + '/dispatch', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 3000,
    });

    dispatchSocket.on('connect', () => {
      console.log('[Dispatch] Conectado ao namespace /dispatch');
      badge.style.display = 'block';
      setTimeout(() => { badge.style.display = 'none'; }, 3000);
    });

    dispatchSocket.on('disconnect', () => {
      console.log('[Dispatch] Desconectado de /dispatch');
    });

    dispatchSocket.on('dispatch_offer', (offer) => {
      console.log('[Dispatch] Oferta recebida:', offer);
      _showOffer(offer);
    });

    dispatchSocket.on('dispatch_timeout', ({ emergencyId }) => {
      if (currentOffer?.emergencyId === emergencyId) {
        _timeoutModal();
      }
    });

    dispatchSocket.on('dispatch_taken', ({ emergencyId }) => {
      if (currentOffer?.emergencyId === emergencyId) {
        _clearModal();
        if (typeof Toast !== 'undefined') Toast.show('Esta emergência já foi aceita por outro prestador.', 'info');
      }
    });
  }

  function disconnect() {
    dispatchSocket?.disconnect();
    dispatchSocket = null;
    _clearModal();
  }

  return { connect, disconnect, accept, reject };
})();
"""

PATCH_PAGES_DISPATCH = r"""
// ── Auto-conecta Dispatch se usuário for MECHANIC ou SELLER ──
(function() {
  function _tryConnectDispatch() {
    try {
      const raw = localStorage.getItem('mobya_user') || sessionStorage.getItem('mobya_user');
      if (!raw) return;
      const user = JSON.parse(raw);
      if (['MECHANIC','SELLER','ADMIN','SUPER_ADMIN'].includes(user?.role)) {
        if (typeof DispatchUI !== 'undefined') DispatchUI.connect();
      }
    } catch {}
  }
  // Tenta ao carregar e também quando o app navegar (após login)
  document.addEventListener('DOMContentLoaded', () => setTimeout(_tryConnectDispatch, 1500));
  window.addEventListener('mobya:auth', () => setTimeout(_tryConnectDispatch, 500));
})();
"""

def patch_index_html():
    path = os.path.join(ROOT, "index.html")
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()

    if "dispatch-ui.js" in src:
        print("[SKIP] index.html já inclui dispatch-ui.js")
        return

    # Injeta antes do fechamento do </body>
    old = "</body>"
    new = '  <script src="js/dispatch-ui.js"></script>\n</body>'
    if old not in src:
        print("[ERRO] </body> não encontrado em index.html")
        return
    src = src.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("[OK] index.html atualizado (dispatch-ui.js injetado)")

def patch_auth_dispatch_hook():
    """Injeta auto-connect dentro do updateUI(u) do auth.js"""
    path = os.path.join(ROOT, "js/auth.js")
    if not os.path.exists(path):
        print("[SKIP] js/auth.js não encontrado")
        return
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    if "DispatchUI" in src:
        print("[SKIP] js/auth.js já tem DispatchUI.connect()")
        return
    # Injeta no final do bloco updateUI, antes do fechamento
    old = "    if (typeof updateSidebarRoles === 'function') updateSidebarRoles(u);\n  }"
    new = (
        "    if (typeof updateSidebarRoles === 'function') updateSidebarRoles(u);\n"
        "    // Fase 4B: auto-connect dispatch para prestadores\n"
        "    if (u && ['MECHANIC','SELLER','ADMIN','SUPER_ADMIN'].includes(u.role)) {\n"
        "      if (typeof DispatchUI !== 'undefined') setTimeout(() => DispatchUI.connect(), 800);\n"
        "    } else if (!u) {\n"
        "      if (typeof DispatchUI !== 'undefined') DispatchUI.disconnect();\n"
        "    }\n"
        "  }"
    )
    if old not in src:
        print("[ERRO] bloco updateUI não encontrado em auth.js — aplique manualmente.")
        return
    src = src.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("[OK] js/auth.js atualizado (DispatchUI auto-connect/disconnect no updateUI)")

def run():
    print("=== Patch Fase 4B: Dispatch UI (prestador aceitar/rejeitar) ===")
    w("js/dispatch-ui.js", DISPATCH_JS)
    w("js/_dispatch-autoconnect.js", PATCH_PAGES_DISPATCH)
    patch_index_html()
    patch_auth_dispatch_hook()
    print()
    print("=== PRÓXIMOS PASSOS ===")
    print("git add -A && git commit -m 'feat: dispatch fase4b UI prestador aceitar/rejeitar' && git push")
    print()
    print("=== TESTE MANUAL ===")
    print("1. Logue como MECHANIC no app")
    print("2. Abra o console do browser — deve aparecer '[Dispatch] Conectado ao namespace /dispatch'")
    print("3. Em outro browser, crie uma Emergency com latitude/longitude preenchidos")
    print("4. O modal de oferta deve aparecer automaticamente no prestador com countdown de 15s")

if __name__ == "__main__":
    run()
