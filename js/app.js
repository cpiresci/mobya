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


// ============================================================
// MOBYA — app.js  Quantum Engine v5.0
// Correções: syncNav completo (header+sidebar+bottom-nav),
//            HomeChat.reset() ao sair da home.
// ============================================================

window.Toast = (() => {
  function ensureWrap() {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      wrap.style.cssText =
        'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:340px';
      document.body.appendChild(wrap);
    }
    return wrap;
  }
  const COLORS = {
    ok:   { bg:'rgba(16,185,129,.12)', border:'rgba(16,185,129,.35)', text:'#10b981' },
    err:  { bg:'rgba(239,68,68,.12)',  border:'rgba(239,68,68,.35)',  text:'#ef4444' },
    warn: { bg:'rgba(245,158,11,.12)', border:'rgba(245,158,11,.35)', text:'#f59e0b' },
    info: { bg:'rgba(124,58,237,.12)', border:'rgba(124,58,237,.35)', text:'#a78bfa' },
  };
  function show(msg, type='info', duration=3500) {
    const wrap = ensureWrap();
    const c = COLORS[type] || COLORS.info;
    const el = document.createElement('div');
    el.style.cssText =
      `background:${c.bg};border:1px solid ${c.border};color:${c.text};padding:12px 16px;` +
      `border-radius:10px;font-family:'Space Grotesk',sans-serif;font-size:.84rem;font-weight:500;` +
      `box-shadow:0 4px 20px rgba(0,0,0,.35);backdrop-filter:blur(8px);` +
      `opacity:0;transform:translateX(16px);transition:all .25s ease;`;
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='translateX(0)'; });
    setTimeout(() => {
      el.style.opacity='0'; el.style.transform='translateX(16px)';
      setTimeout(() => el.remove(), 250);
    }, duration);
  }
  return { show };
})();

function comingSoon(title, icon='🚧') {
  const el = document.getElementById('main');
  if (!el) return;
  el.innerHTML =
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;` +
    `min-height:50vh;text-align:center;gap:14px;padding:40px">` +
    `<div style="font-size:3rem">${icon}</div>` +
    `<div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:3px;` +
    `background:linear-gradient(135deg,#fff,var(--q3),var(--neon));-webkit-background-clip:text;-webkit-text-fill-color:transparent">${title}</div>` +
    `<div style="color:var(--muted);font-size:.85rem;max-width:380px">Este módulo está em desenvolvimento e estará disponível em breve.</div>` +
    `<button onclick="App.navigate('home')" style="margin-top:8px;background:var(--s2);border:1px solid var(--border);color:var(--text);padding:10px 22px;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-weight:600;cursor:pointer">← Voltar ao painel</button></div>`;
}

function renderChatPage() {
  const el = document.getElementById('main');
  if (!el) return;
  el.innerHTML =
    `<div style="margin-bottom:24px">` +
    `<div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;` +
    `background:linear-gradient(135deg,#fff,var(--q3),var(--neon));-webkit-background-clip:text;-webkit-text-fill-color:transparent">CHAT QUÂNTICO</div>` +
    `<div style="color:var(--muted);font-size:.84rem;margin-top:4px">Converse com os agentes NEXUS em tempo real</div></div>` +
    `<div id="agentChatContainer"></div>`;
  if (typeof Chat !== 'undefined') Chat.render('agentChatContainer', 'orquestrador');
}

if (typeof Pages === 'undefined') {
  console.error('[MOBYA] pages.js falhou');
  window.Pages = {};
  ['renderHome','renderClassificados','renderAgentes','renderEmergencia',
   'renderCalculadoras','renderVistoria','renderDocumentacao','renderDashboard','renderListing']
  .forEach(m => Pages[m] = () => {});
}

const BASE_PAGES = {
  home:          () => Pages.renderHome(),
  classificados: () => Pages.renderClassificados(),
  agentes:       () => Pages.renderAgentes(),
  emergencia:    () => Pages.renderEmergencia(),
  calculadoras:  () => Pages.renderCalculadoras(),
  vistoria:      () => Pages.renderVistoria(),
  documentacao:  () => Pages.renderDocumentacao(),
  dashboard:     () => Pages.renderDashboard(),
  garagem:       () => (typeof Garagem!=='undefined' ? Garagem.render() : comingSoon('GARAGEM','🚗')),
  chat:          () => renderChatPage(),
  listing:       () => Pages.renderListing(window.__mobyaListingId),
  pecas:         () => Pages.renderPecas(),
  aluguel:       () => (typeof PagesExtra!=='undefined' ? PagesExtra.renderAluguel()  : comingSoon('ALUGUEL DE VEÍCULOS','🗝️')),
  servicos:      () => Pages.renderServicos(),
  reboque:       () => (typeof PagesExtra!=='undefined' ? PagesExtra.renderReboque()  : comingSoon('REBOQUE & GUINCHO','🚛')),
  chaveiro:      () => (typeof PagesExtra!=='undefined' ? PagesExtra.renderChaveiro() : comingSoon('CHAVEIRO AUTOMOTIVO','🔑')),
  seguros:       () => (typeof PagesMon !=='undefined' ? PagesMon.renderSeguros()     : comingSoon('SEGUROS','🛡️')),
  consorcio:     () => (typeof PagesMon !=='undefined' ? PagesMon.renderConsorcio()   : comingSoon('CONSÓRCIOS','🤝')),
  financiamento: () => (typeof PagesMon !=='undefined' ? PagesMon.renderFinanciamento(): comingSoon('FINANCIAMENTO','💰')),
  mecanico:      () => (typeof PagesExtra!=='undefined' ? PagesExtra.renderMecanico() : comingSoon('MECÂNICO DE EMERGÊNCIA','🔧')),
  'meus-anuncios':    () => Pages.renderDashboard(),
  monetizacao:        () => (typeof Monetization!=='undefined'&&Monetization.renderPartnersPage   ? Monetization.renderPartnersPage()    : comingSoon('REDE DE PARCEIROS','🤝')),
  'painel-prestador': () => (typeof Monetization!=='undefined'&&Monetization.renderProviderDashboard ? Monetization.renderProviderDashboard() : comingSoon('PAINEL DO PRESTADOR','🛠️')),
  wallet: () => navigate('carteira-prestador'),
  'carteira-prestador': () => {
    const user = MobyaAuth.getUser();
    if (!user) { MobyaAuth.showLogin('carteira-prestador'); return; }
    if (typeof WalletPage !== 'undefined') WalletPage.render();
    else comingSoon('CARTEIRA','💰');
  },
  'gps-tracking': () => {
    const user = MobyaAuth.getUser();
    if (!user) { MobyaAuth.showLogin('gps-tracking'); return; }
    const sid = window.__mobyaTrackingSessionId || null;
    window.__mobyaTrackingSessionId = null;
    if (typeof GPSTracking!=='undefined') GPSTracking.render(sid);
    else comingSoon('GPS TRACKING','📡');
  },
  'ultra-gps': () => {
    const user = MobyaAuth.getUser();
    if (!user) { MobyaAuth.showLogin('ultra-gps'); return; }
    const sid = window.__mobyaTrackingSessionId || null;
    window.__mobyaTrackingSessionId = null;
    if (typeof UltraGPS!=='undefined') UltraGPS.render(sid);
    else comingSoon('ULTRA GPS','🛣️');
  },
  'ultra-gps': () => {
    const user = MobyaAuth.getUser();
    if (!user) { MobyaAuth.showLogin('ultra-gps'); return; }
    const sid = window.__mobyaTrackingSessionId || null;
    window.__mobyaTrackingSessionId = null;
    if (typeof UltraGPS!=='undefined') UltraGPS.render(sid);
    else comingSoon('ULTRA GPS','🛣️');
  },
  'admin-aprovacao': () => {
    const u = MobyaAuth.getUser();
    if (!u||!['ADMIN','SUPER_ADMIN'].includes(u.role)) { App.navigate('home'); return; }
    if (typeof AdminApproval!=='undefined') AdminApproval.render();
    else comingSoon('APROVAÇÃO','✅');
  },
  'painel-receita': () => (typeof Monetization!=='undefined'&&Monetization.renderRevenueDashboard  ? Monetization.renderRevenueDashboard()  : comingSoon('PAINEL DE RECEITA','📊')),
  'seguros-sim':    () => (typeof Monetization!=='undefined'&&Monetization.renderInsurancePage      ? Monetization.renderInsurancePage()      : comingSoon('SEGUROS IA','🛡️')),
  fretes:           () => (typeof PagesExtra!=='undefined' ? PagesExtra.renderFrete() : comingSoon('FRETE & TRANSPORTE','🚚')),
  'painel-anfitriao': () => { const u=MobyaAuth.getUser(); if(!u){MobyaAuth.showLogin('painel-anfitriao');return;} if(typeof RentalHost!=='undefined') RentalHost.render(); else comingSoon('PAINEL DO ANFITRIÃO','🗝️'); },
  'minhas-reservas': () => { const u=MobyaAuth.getUser(); if(!u){MobyaAuth.showLogin('minhas-reservas');return;} if(typeof RentalGuest!=='undefined') RentalGuest.render(); else comingSoon('MINHAS RESERVAS','🗝️'); },
  'notificacoes': () => { const u=MobyaAuth.getUser(); if(!u){MobyaAuth.showLogin('notificacoes');return;} NotificacoesPage.render(); },
};

// ── Sync total de navegação ────────────────────────────────────
window.renderPage = function(page) {
  // 1. Header nav
  document.querySelectorAll('#nav .nb[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));

  // 2. Sidebar
  document.querySelectorAll('.sb-item[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));

  // 3. Bottom nav
  document.querySelectorAll('#bottom-nav .bn-item[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));

  // 4. Scroll topo
  const mainEl = document.getElementById('main');
  if (mainEl) mainEl.scrollTop = 0;
  window.scrollTo({ top:0, behavior:'instant' });

  // 5. Renderizar
  const handler = BASE_PAGES[page];
  if (handler) {
    try { handler(); } catch(e) {
      console.error('[MOBYA] Erro ao renderizar página', page, e);
      const m = document.getElementById('main');
      if (m) m.innerHTML = `<pre style="color:red;padding:20px;font-size:11px">${e}\n${e.stack||''}</pre>`;
    }
  } else {
    comingSoon((page||'PÁGINA').toUpperCase());
  }
};

window.App = (() => {
  let currentPage = 'home';
  let _firstNav = true;

  function navigate(page, param) {
    const leaving = currentPage;
    currentPage = page;
    if (param !== undefined) window.__mobyaListingId = param;
    if (_firstNav) {
      // Planta a sentinela "home" no fundo da pilha (replace, sem disparar popstate)
      // e em seguida empilha a página inicial real por cima.
      // Isso garante que SEMPRE existe uma entrada 'home' abaixo de qualquer
      // navegação, sem que o popstate handler precise re-empilhar nada.
      history.replaceState({ page: 'home', __sentinel: true }, '', '#home');
      if (page !== 'home') {
        history.pushState({ page }, '', `#${page}`);
      }
      _firstNav = false;
    } else {
      history.pushState({ page }, '', `#${page}`);
    }
    closeMenu();
    if (leaving === 'home' && page !== 'home') {
      if (typeof HomeChat !== 'undefined' && HomeChat.reset) HomeChat.reset();
    }
    window.renderPage(page);
  }

  function toast(msg, type='info', duration) { Toast.show(msg, type, duration); }
  function getCurrentPage() { return currentPage; }

  function closeMenu() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('header')?.classList.remove('menu-open');
    document.getElementById('bnMenuBtn')?.classList.remove('active');
  }

  function toggleMenu() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('header')?.classList.toggle('menu-open');
  }
  window.toggleMenu = toggleMenu;

  window.toggleBnMenu = function() {
    const sidebar = document.getElementById('sidebar');
    const bnBtn   = document.getElementById('bnMenuBtn');
    if (!sidebar) return;
    const isOpen = sidebar.classList.toggle('open');
    if (bnBtn) bnBtn.classList.toggle('active', isOpen);
  };

  function bindNavigation() {
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const page = el.dataset.page;
        if (page) navigate(page);
      });
    });
    document.addEventListener('click', ev => {
      const sidebar  = document.getElementById('sidebar');
      const btnMenu  = document.getElementById('btnMenu');
      const bnMenuBtn= document.getElementById('bnMenuBtn');
      if (!sidebar || !sidebar.classList.contains('open')) return;
      if (sidebar.contains(ev.target) || ev.target===btnMenu || ev.target===bnMenuBtn) return;
      sidebar.classList.remove('open');
      document.getElementById('bnMenuBtn')?.classList.remove('active');
      document.getElementById('header')?.classList.remove('menu-open');
    });
  }

  function hideLoadingScreen() {
    const ls = document.getElementById('ls');
    if (!ls) return;
    ls.style.opacity = '0';
    ls.style.transition = 'opacity .4s ease';
    setTimeout(() => ls.remove(), 450);
  }

  function setLoadingProgress(pct, txt) {
    const fill  = document.getElementById('lsFill');
    const label = document.getElementById('lsTxt');
    if (fill)  fill.style.width = `${pct}%`;
    if (label && txt) label.textContent = txt;
  }

  async function init() {
    setLoadingProgress(30, 'Montando interface...');
    bindNavigation();

    if (typeof Monetization!=='undefined' && typeof Monetization.init==='function') {
      try { Monetization.init(); } catch(e) { console.warn('Monetization init falhou', e); }
    }

    setLoadingProgress(60, 'Verificando sessao...');
    try { await Promise.race([API.ping(), new Promise(r => setTimeout(r,5000))]); } catch {}
    if (typeof MobyaAuth !== 'undefined') {
      try { await Promise.race([MobyaAuth.init(), new Promise(r => setTimeout(r,5000))]); } catch {}
    }

    window.addEventListener('popstate', (ev) => {
      // Nunca chamar pushState/replaceState aqui dentro — re-empilhar history
      // de dentro do handler de popstate é o que dispara a Chrome History
      // Manipulation Intervention no Android, fazendo o botão físico de voltar
      // "pular" estados de forma inconsistente após algumas navegações.
      const page = ev.state?.page || (location.hash || '#home').replace('#', '') || 'home';
      const leaving = currentPage;

      currentPage = page;
      if (leaving === 'home' && page !== 'home' && typeof HomeChat !== 'undefined' && HomeChat.reset) {
        HomeChat.reset();
      }
      closeMenu();
      window.renderPage(page);
    });

    const initial = (location.hash || '#home').replace('#','') || 'home';
    setLoadingProgress(100, 'Pronto.');
    navigate(initial);
    if (API.isAuth()) Notif.start();
    setTimeout(hideLoadingScreen, 300);
    setInterval(() => API.ping().catch(()=>{}), 60000);
  }

  return { navigate, toast, getCurrentPage, toggleMenu, init };
})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { document.getElementById('ls')?.remove(); }, 2000);
  App.init().catch(err => {
    console.error('[MOBYA] Falha ao iniciar', err);
    const m = document.getElementById('main');
    if (m) m.innerHTML = `<pre style="color:red;padding:20px;font-size:12px">ERRO INIT: ${err}\n${err.stack||''}</pre>`;
    Toast.show('Erro ao iniciar o motor quântico.','err',6000);
    document.getElementById('ls')?.remove();
  });
});
