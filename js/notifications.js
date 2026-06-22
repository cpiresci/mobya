// js/notifications.js
window.Notif = (() => {
  const POLL_INTERVAL = 30_000;
  let _pollTimer = null;
  let _open = false;
  let _items = [];

  const esc = t => String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function _fmtAge(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return 'agora';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  const TYPE_ICON = {
    LISTING_MESSAGE:'🗝️', PRICE_DROP:'💸', LISTING_EXPIRED:'⏰',
    PAYMENT_RECEIVED:'💰', EMERGENCY_UPDATE:'🚨', SYSTEM:'📢', AI_INSIGHT:'🤖',
  };

  function _setBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'block'; }
    else badge.style.display = 'none';
  }

  function _showBtn(show) {
    const btn = document.getElementById('btnNotif');
    if (btn) btn.style.display = show ? 'inline-flex' : 'none';
  }

  function _getOrCreateDropdown() {
    let el = document.getElementById('notifDropdown');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'notifDropdown';
    el.style.cssText = `position:fixed;top:54px;right:12px;width:min(360px,calc(100vw - 24px));
      max-height:480px;background:var(--s2,#1a1a2e);
      border:1px solid var(--border,rgba(255,255,255,.1));
      border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.5);
      display:flex;flex-direction:column;z-index:9999;overflow:hidden;`;
    document.body.appendChild(el);
    document.addEventListener('click', e => {
      if (_open && !el.contains(e.target) && e.target.id !== 'btnNotif') _close();
    });
    return el;
  }

  function _itemHTML(n) {
    const icon = TYPE_ICON[n.type] || '📢';
    return `<div onclick="Notif.read('${esc(n.id)}')" style="
        padding:12px 16px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));
        cursor:pointer;display:flex;gap:11px;align-items:flex-start;
        ${n.read ? '' : 'background:rgba(0,245,255,.04);'}"
      onmouseover="this.style.background='rgba(255,255,255,.05)'"
      onmouseout="this.style.background='${n.read ? 'transparent' : 'rgba(0,245,255,.04)'}'">
      <div style="font-size:1.25rem;line-height:1;padding-top:2px;flex-shrink:0">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div style="font-size:.78rem;font-weight:${n.read?'500':'700'};
            color:${n.read?'var(--muted,#888)':'var(--text,#eee)'};
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(n.title)}</div>
          <div style="font-size:.62rem;color:var(--muted,#888);font-family:'JetBrains Mono',monospace;flex-shrink:0">${_fmtAge(n.createdAt)}</div>
        </div>
        <div style="font-size:.72rem;color:var(--muted,#888);margin-top:2px;line-height:1.4;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(n.body)}</div>
        ${!n.read ? '<div style="width:6px;height:6px;background:var(--neon,#00f5ff);border-radius:50%;display:inline-block;margin-top:4px"></div>' : ''}
      </div>
    </div>`;
  }

  function _renderDropdown() {
    const el = _getOrCreateDropdown();
    const unread = _items.filter(n => !n.read).length;
    el.innerHTML = `
      <div style="padding:14px 16px 10px;display:flex;align-items:center;
        justify-content:space-between;border-bottom:1px solid var(--border,rgba(255,255,255,.08))">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;
          letter-spacing:2px;color:var(--neon,#00f5ff)">🔔 NOTIFICAÇÕES
          ${unread > 0 ? `<span style="font-size:.65rem;background:var(--red,#f44);color:#fff;border-radius:10px;padding:1px 7px;margin-left:6px;font-family:'JetBrains Mono',monospace">${unread}</span>` : ''}
        </div>
        ${unread > 0 ? `<button onclick="Notif.markAll()" style="font-size:.65rem;font-family:'JetBrains Mono',monospace;background:none;border:none;color:var(--muted,#888);cursor:pointer;text-decoration:underline">marcar todas lidas</button>` : ''}
      </div>
      <div id="notifList" style="overflow-y:auto;flex:1">
        ${_items.length === 0
          ? '<div style="padding:32px 16px;text-align:center;color:var(--muted,#888);font-size:.82rem;font-family:\'JetBrains Mono\',monospace">Nenhuma notificação ainda 🔕</div>'
          : _items.map(_itemHTML).join('')}
      </div>
      <div style="padding:10px 16px;border-top:1px solid var(--border,rgba(255,255,255,.08));text-align:center">
        <button onclick="App.navigate('notificacoes');Notif.close()" style="font-size:.72rem;font-family:'JetBrains Mono',monospace;background:none;border:none;color:var(--neon,#00f5ff);cursor:pointer;letter-spacing:1px">VER TODAS →</button>
      </div>`;
  }

  function toggle() { _open ? _close() : _openDropdown(); }

  function _openDropdown() {
    _open = true;
    _renderDropdown();
    _getOrCreateDropdown().style.display = 'flex';
    refresh();
  }

  function _close() {
    _open = false;
    const el = document.getElementById('notifDropdown');
    if (el) el.style.display = 'none';
  }

  async function refresh() {
    if (!API.isAuth()) return;
    try {
      const res = await API.notifications.list({ limit: 20 });
      _items = res.data || res || [];
      _setBadge(_items.filter(n => !n.read).length);
      if (_open) _renderDropdown();
    } catch (_) {}
  }

  async function fetchUnreadCount() {
    if (!API.isAuth()) return;
    try {
      const res = await API.notifications.unread();
      _setBadge(res.data?.count ?? 0);
    } catch (_) {}
  }

  async function read(id) {
    try {
      await API.notifications.markRead(id);
      const n = _items.find(x => x.id === id);
      if (n) { n.read = true; _setBadge(_items.filter(x => !x.read).length); if (_open) _renderDropdown(); }
      const page = _items.find(x => x.id === id)?.data?.page;
      if (page) { _close(); App.navigate(page); }
    } catch (_) {}
  }

  async function markAll() {
    try {
      await API.notifications.markAll();
      _items.forEach(n => n.read = true);
      _setBadge(0);
      if (_open) _renderDropdown();
    } catch (_) {}
  }

  function _startPoll() { _stopPoll(); _pollTimer = setInterval(fetchUnreadCount, POLL_INTERVAL); }
  function _stopPoll()  { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } }

  function init() {
    window.addEventListener('mobya:login',  () => { _showBtn(true);  fetchUnreadCount(); _startPoll(); });
    window.addEventListener('mobya:logout', () => { _showBtn(false); _setBadge(0); _stopPoll(); _close(); _items = []; });
    if (API.isAuth()) { _showBtn(true); fetchUnreadCount(); _startPoll(); }
  }

  return { init, toggle, close: _close, refresh, read, markAll };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Notif.init());
else Notif.init();
