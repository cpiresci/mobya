import os, sys

# ── 1. api.js — adiciona API.notifications ──────────────────
API = "js/api.js"
with open(API, "r", encoding="utf-8") as f:
    api = f.read()

NOTIF_OBJ = """
  const notifications = {
    list:       (p={}) => get(`/notifications?${new URLSearchParams(p)}`),
    unread:     ()     => get('/notifications/unread-count'),
    markRead:   (id)   => patch(`/notifications/${id}/read`, {}),
    markAll:    ()     => patch('/notifications/read-all', {}),
  };

"""
OLD_RET = "  return { setToken, getToken, isAuth, get, post, put, patch, del, req: reqCompat, auth, ai, listings, emergency, monetization, vehicle, wallet, rental, pollEmergency, ping };"
NEW_RET = "  return { setToken, getToken, isAuth, get, post, put, patch, del, req: reqCompat, auth, ai, listings, emergency, monetization, vehicle, wallet, rental, notifications, pollEmergency, ping };"

if "const notifications" in api:
    print("[SKIP] API.notifications ja existe")
else:
    if OLD_RET not in api:
        print("[ERRO] ancora return nao encontrada"); sys.exit(1)
    api = api.replace(OLD_RET, NOTIF_OBJ + NEW_RET)
    with open(API, "w", encoding="utf-8") as f:
        f.write(api)
    print("[OK] API.notifications adicionado")

# ── 2. index.html — adiciona sino entre btnCta e btnMenu ────
HTML = "index.html"
with open(HTML, "r", encoding="utf-8") as f:
    html = f.read()

SINO_HTML = """<button class="btn-notif" id="btnNotif" onclick="Notif.toggle()" style="display:none;position:relative;background:none;border:none;color:var(--text);font-size:1.3rem;cursor:pointer;padding:4px 6px">🔔<span id="notifBadge" style="display:none;position:absolute;top:0;right:0;background:var(--red,#f44);color:#fff;border-radius:50%;font-size:.6rem;min-width:16px;height:16px;line-height:16px;text-align:center;padding:0 3px">0</span></button>
"""
ANCHOR = '<button class="btn-menu" id="btnMenu"'
if 'id="btnNotif"' in html:
    print("[SKIP] sino ja existe no index.html")
else:
    if ANCHOR not in html:
        print("[ERRO] ancora btnMenu nao encontrada"); sys.exit(1)
    html = html.replace(ANCHOR, SINO_HTML + ANCHOR)
    with open(HTML, "w", encoding="utf-8") as f:
        f.write(html)
    print("[OK] sino adicionado ao header no index.html")

# ── 3. app.js — adiciona modulo Notif ───────────────────────
APP = "js/app.js"
with open(APP, "r", encoding="utf-8") as f:
    app = f.read()

NOTIF_MOD = """
// ── Módulo de Notificações ───────────────────────────────────────────────────
const Notif = (() => {
  let _open = false;
  let _timer = null;
  let _panel = null;

  function _badge(n) {
    const b = document.getElementById('notifBadge');
    const btn = document.getElementById('btnNotif');
    if (!b || !btn) return;
    if (n > 0) {
      b.textContent = n > 99 ? '99+' : n;
      b.style.display = 'inline-block';
      btn.style.animation = 'none';
    } else {
      b.style.display = 'none';
    }
  }

  async function _fetchCount() {
    if (!API.isAuth()) return;
    try {
      const r = await API.notifications.unread();
      _badge(r?.data?.count || 0);
    } catch(_) {}
  }

  async function _fetchList() {
    try {
      const r = await API.notifications.list({ limit: 20 });
      return r?.data || [];
    } catch(_) { return []; }
  }

  function _renderPanel(items) {
    if (_panel) _panel.remove();
    _panel = document.createElement('div');
    _panel.id = 'notifPanel';
    _panel.style.cssText = 'position:fixed;top:56px;right:8px;width:320px;max-width:94vw;max-height:70vh;overflow-y:auto;background:var(--surface,#1a1a2e);border:1px solid var(--border,#333);border-radius:12px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.5)';
    const header = `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border,#333)"><span style="font-weight:700;font-size:.9rem">🔔 Notificações</span><button onclick="Notif.markAll()" style="background:none;border:none;color:var(--neon,#00ff88);font-size:.75rem;cursor:pointer">Marcar todas lidas</button></div>`;
    const body = items.length
      ? items.map(n => `
        <div onclick="Notif.markRead('${n.id}')" style="padding:12px 16px;border-bottom:1px solid var(--border,#222);cursor:pointer;opacity:${n.read?'0.5':'1'};background:${n.read?'transparent':'rgba(0,255,136,.04)'}">
          <div style="font-size:.82rem;font-weight:600">${n.title || 'Notificação'}</div>
          <div style="font-size:.78rem;color:var(--muted,#888);margin-top:2px">${n.body || ''}</div>
          <div style="font-size:.7rem;color:var(--muted,#666);margin-top:4px">${new Date(n.createdAt).toLocaleString('pt-BR')}</div>
        </div>`).join('')
      : '<div style="padding:24px;text-align:center;color:var(--muted,#888);font-size:.84rem">Nenhuma notificação ainda.</div>';
    _panel.innerHTML = header + body;
    document.body.appendChild(_panel);
    // fecha ao clicar fora
    setTimeout(() => {
      document.addEventListener('click', _outside, { once: true });
    }, 50);
  }

  function _outside(e) {
    if (_panel && !_panel.contains(e.target) && e.target.id !== 'btnNotif') {
      _panel.remove(); _panel = null; _open = false;
    }
  }

  async function toggle() {
    if (_open && _panel) { _panel.remove(); _panel = null; _open = false; return; }
    _open = true;
    const items = await _fetchList();
    _renderPanel(items);
    _badge(0); // zera visualmente ao abrir
  }

  async function markRead(id) {
    try { await API.notifications.markRead(id); } catch(_) {}
    const el = _panel?.querySelector(`[onclick*="${id}"]`);
    if (el) { el.style.opacity = '0.5'; el.style.background = 'transparent'; }
  }

  async function markAll() {
    try { await API.notifications.markAll(); } catch(_) {}
    _badge(0);
    if (_panel) {
      _panel.querySelectorAll('[onclick*="markRead"]').forEach(el => {
        el.style.opacity = '0.5'; el.style.background = 'transparent';
      });
    }
  }

  function start() {
    const btn = document.getElementById('btnNotif');
    if (btn) btn.style.display = 'inline-block';
    _fetchCount();
    _timer = setInterval(_fetchCount, 30000); // poll a cada 30s
  }

  function stop() {
    if (_timer) clearInterval(_timer);
    if (_panel) { _panel.remove(); _panel = null; }
    const btn = document.getElementById('btnNotif');
    if (btn) btn.style.display = 'none';
    _badge(0);
  }

  return { toggle, markRead, markAll, start, stop };
})();
window.Notif = Notif;

"""

ANCHOR_APP = "// ── Módulo de Notificações"
if ANCHOR_APP in app:
    print("[SKIP] modulo Notif ja existe em app.js")
else:
    # Insere antes do return do App
    RETURN_APP = "  return { navigate, toast, getCurrentPage, toggleMenu, init };"
    if RETURN_APP not in app:
        print("[ERRO] ancora return App nao encontrada"); sys.exit(1)
    app = NOTIF_MOD + app
    with open(APP, "w", encoding="utf-8") as f:
        f.write(app)
    print("[OK] modulo Notif adicionado a app.js")

# ── 4. app.js — liga/desliga Notif no login/logout ──────────
with open(APP, "r", encoding="utf-8") as f:
    app = f.read()

# Procura onde o auth chama navigate('home') após login para injetar Notif.start()
START_ANCHOR = "App.navigate('home')"
if "Notif.start()" in app:
    print("[SKIP] Notif.start ja injetado")
else:
    # Estrategia: adiciona Notif.start() na funcao init do App, apos checar auth
    INIT_ANCHOR = "navigate(initial);"
    if INIT_ANCHOR in app:
        app = app.replace(INIT_ANCHOR, INIT_ANCHOR + "\n    if (API.isAuth()) Notif.start();", 1)
        with open(APP, "w", encoding="utf-8") as f:
            f.write(app)
        print("[OK] Notif.start() injetado no init do App")
    else:
        print("[SKIP] ancora init nao encontrada — adicione Notif.start() manualmente apos login")

print("\n[OK] Patch de notificacoes concluido!")
