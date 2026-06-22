// js/notificacoes-page.js
window.NotificacoesPage = (() => {
  const esc = t => String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const TYPE_ICON  = { LISTING_MESSAGE:'🗝️', PRICE_DROP:'💸', LISTING_EXPIRED:'⏰', PAYMENT_RECEIVED:'💰', EMERGENCY_UPDATE:'🚨', SYSTEM:'📢', AI_INSIGHT:'🤖' };
  const TYPE_COLOR = { LISTING_MESSAGE:'var(--neon,#00f5ff)', PRICE_DROP:'var(--green,#10b981)', LISTING_EXPIRED:'var(--gold,#f59e0b)', PAYMENT_RECEIVED:'var(--green,#10b981)', EMERGENCY_UPDATE:'var(--red,#ef4444)', SYSTEM:'var(--muted,#94a3b8)', AI_INSIGHT:'#a78bfa' };

  function _fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  let _page = 1, _loading = false, _total = 0;
  const LIMIT = 30;

  function _card(n) {
    const icon  = TYPE_ICON[n.type]  || '📢';
    const color = TYPE_COLOR[n.type] || 'var(--muted)';
    const borderColor = n.read ? 'var(--border,rgba(255,255,255,.08))' : color.replace(')', ',.3)');
    return `<div id="ncard-${esc(n.id)}" onclick="NotificacoesPage.read('${esc(n.id)}')"
      style="background:var(--s2,#1a1a2e);border:1px solid ${borderColor};
        border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;"
      onmouseover="this.style.borderColor='${color.replace(')', ',.5)')}'"
      onmouseout="this.style.borderColor='${borderColor}'">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="font-size:1.6rem;line-height:1;padding-top:2px;flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:.88rem;
              font-weight:${n.read?'500':'700'};color:${n.read?'var(--muted,#888)':'var(--text,#eee)'};flex:1">
              ${esc(n.title)}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              ${!n.read ? `<div style="width:7px;height:7px;background:${color};border-radius:50%"></div>` : ''}
              <div style="font-size:.65rem;color:var(--muted,#888);font-family:'JetBrains Mono',monospace">${_fmtDate(n.createdAt)}</div>
            </div>
          </div>
          <div style="font-size:.78rem;color:var(--muted,#94a3b8);margin-top:5px;line-height:1.5">${esc(n.body)}</div>
          <div style="margin-top:6px">
            <span style="font-size:.6rem;font-family:'JetBrains Mono',monospace;padding:2px 8px;border-radius:4px;
              background:${color.replace(')', ',.1)')};color:${color};border:1px solid ${color.replace(')', ',.2)')}">
              ${n.type}
            </span>
          </div>
        </div>
      </div>
    </div>`;
  }

  async function render() {
    const main = document.getElementById('main');
    if (!main) return;
    _page = 1;
    main.innerHTML = `
      <div style="padding:18px 16px;max-width:600px;margin:0 auto">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:20px">
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.9rem;letter-spacing:2px;
              background:linear-gradient(135deg,#00f5ff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">
              🔔 NOTIFICAÇÕES
            </div>
            <div style="font-size:.72rem;color:var(--muted,#888);font-family:'JetBrains Mono',monospace">Suas atualizações recentes</div>
          </div>
          <button onclick="NotificacoesPage.markAll()" style="background:rgba(0,245,255,.08);border:1px solid rgba(0,245,255,.2);
            color:var(--neon,#00f5ff);border-radius:8px;padding:8px 14px;font-size:.72rem;
            font-family:'JetBrains Mono',monospace;cursor:pointer;letter-spacing:1px">
            ✓ MARCAR TODAS LIDAS
          </button>
        </div>
        <div id="notif-list" style="display:flex;flex-direction:column;gap:10px">
          <div style="color:var(--muted);font-size:.85rem;font-family:'JetBrains Mono',monospace">Carregando...</div>
        </div>
        <div id="notif-more" style="margin-top:16px;text-align:center"></div>
      </div>`;
    await _load(true);
  }

  async function _load(reset = false) {
    if (_loading) return;
    _loading = true;
    try {
      const res = await API.notifications.list({ page: _page, limit: LIMIT });
      const items = res.data || [];
      _total = res.pagination?.total ?? items.length;
      const list = document.getElementById('notif-list');
      if (!list) return;
      if (reset) list.innerHTML = '';
      if (items.length === 0 && reset) {
        list.innerHTML = `<div style="padding:48px 16px;text-align:center">
          <div style="font-size:2.5rem;margin-bottom:12px">🔕</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:2px;color:var(--muted,#888)">NENHUMA NOTIFICAÇÃO</div>
          <div style="font-size:.75rem;color:var(--muted,#888);margin-top:6px">As notificações aparecem aqui conforme a atividade na plataforma</div>
        </div>`;
      } else {
        list.insertAdjacentHTML('beforeend', items.map(_card).join(''));
      }
      const moreEl = document.getElementById('notif-more');
      if (moreEl) {
        const loaded = (_page - 1) * LIMIT + items.length;
        moreEl.innerHTML = loaded < _total
          ? `<button onclick="NotificacoesPage.loadMore()" style="background:rgba(255,255,255,.04);
              border:1px solid var(--border,rgba(255,255,255,.1));color:var(--text,#eee);border-radius:8px;
              padding:10px 24px;font-size:.75rem;font-family:'JetBrains Mono',monospace;cursor:pointer;letter-spacing:1px">
              CARREGAR MAIS (${_total - loaded} restantes)
            </button>`
          : '';
      }
    } catch (e) {
      const list = document.getElementById('notif-list');
      if (list && reset) list.innerHTML = `<div style="color:var(--red,#f44);font-size:.82rem;font-family:'JetBrains Mono',monospace">Erro ao carregar notificações.</div>`;
    } finally { _loading = false; }
  }

  async function loadMore() { _page++; await _load(false); }

  async function read(id) {
    try {
      await API.notifications.markRead(id);
      const card = document.getElementById(`ncard-${id}`);
      if (card) { card.style.border = '1px solid var(--border,rgba(255,255,255,.08))'; card.style.boxShadow = 'none'; }
      if (typeof Notif !== 'undefined') Notif.refresh();
    } catch (_) {}
  }

  async function markAll() {
    try {
      await API.notifications.markAll();
      if (typeof App !== 'undefined') App.toast('✅ Todas marcadas como lidas.', 'ok');
      if (typeof Notif !== 'undefined') Notif.refresh();
      await render();
    } catch (_) {}
  }

  return { render, loadMore, read, markAll };
})();
