// ============================================================
// MOBYA — app.js (Quantum Engine v3.0)
// ============================================================

window.Toast = (() => {
  function ensureWrap() {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      wrap.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:340px';
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
    el.style.cssText = `background:${c.bg};border:1px solid ${c.border};color:${c.text};padding:12px 16px;border-radius:10px;font-family:'Space Grotesk',sans-serif;font-size:.84rem;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.35);backdrop-filter:blur(8px);opacity:0;transform:translateX(16px);transition:all .25s ease;`;
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity='1'; el.style.transform='translateX(0)'; });
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(16px)'; setTimeout(() => el.remove(), 250); }, duration);
  }
  return { show };
})();

function comingSoon(title, icon='🚧') {
  const el = document.getElementById('main');
  if (!el) return;
  el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;text-align:center;gap:14px;padding:40px"><div style="font-size:3rem">${icon}</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:3px;background:linear-gradient(135deg,#fff,var(--q3),var(--neon));-webkit-background-clip:text;-webkit-text-fill-color:transparent">${title}</div><div style="color:var(--muted);font-size:.85rem;max-width:380px">Este módulo está em desenvolvimento e estará disponível em breve.</div><button onclick="App.navigate('home')" style="margin-top:8px;background:var(--s2);border:1px solid var(--border);color:var(--text);padding:10px 22px;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-weight:600;cursor:pointer">← Voltar ao painel</button></div>`;
}

function renderChatPage() {
  const el = document.getElementById('main');
  if (!el) return;
  el.innerHTML = `<div style="margin-bottom:24px"><div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;background:linear-gradient(135deg,#fff,var(--q3),var(--neon));-webkit-background-clip:text;-webkit-text-fill-color:transparent">CHAT QUÂNTICO</div><div style="color:var(--muted);font-size:.84rem;margin-top:4px">Converse com os agentes NEXUS em tempo real</div></div><div id="agentChatContainer"></div>`;
  if (typeof Chat !== 'undefined') Chat.render('agentChatContainer', 'orquestrador');
}

if (typeof Pages === "undefined") { console.error("[MOBYA] pages.js falhou"); window.Pages = {}; ["renderHome","renderClassificados","renderAgentes","renderEmergencia","renderCalculadoras","renderVistoria","renderDocumentacao","renderDashboard","renderListing"].forEach(m => Pages[m] = () => {}); }
const BASE_PAGES = {
  home:          () => Pages.renderHome(),
  classificados: () => Pages.renderClassificados(),
  'comprar-carro': () => Pages.renderClassificados(),
  agentes:       () => Pages.renderAgentes(),
  emergencia:    () => Pages.renderEmergencia(),
  calculadoras:  () => Pages.renderCalculadoras(),
  vistoria:      () => Pages.renderVistoria(),
  documentacao:  () => Pages.renderDocumentacao(),
  dashboard:     () => Pages.renderDashboard(),
  chat:          () => renderChatPage(),
  listing:       () => Pages.renderListing(window.__mobyaListingId),
  pecas:         () => Pages.renderPecas(),
  aluguel:       () => (typeof PagesExtra !== 'undefined' ? PagesExtra.renderAluguel()  : comingSoon('ALUGUEL DE VEÍCULOS','🗝️')),
  servicos:      () => Pages.renderServicos(),
  reboque:       () => (typeof PagesExtra !== 'undefined' ? PagesExtra.renderReboque()  : comingSoon('REBOQUE & GUINCHO','🚛')),
  chaveiro:      () => (typeof PagesExtra !== 'undefined' ? PagesExtra.renderChaveiro() : comingSoon('CHAVEIRO AUTOMOTIVO','🔑')),
  seguros:       () => (typeof PagesMon   !== 'undefined' ? PagesMon.renderSeguros()    : comingSoon('SEGUROS','🛡️')),
  financiamento:     () => (typeof PagesMon   !== 'undefined' ? PagesMon.renderFinanciamento()           : comingSoon('FINANCIAMENTO','💰')),
  consorcio:         () => (typeof PagesMon   !== 'undefined' ? PagesMon.renderConsorcio()               : comingSoon('CONSÓRCIOS','🤝')),
  mecanico:          () => (typeof PagesExtra !== 'undefined' ? PagesExtra.renderMecanico()              : comingSoon('MECÂNICO','🔧')),
  fretes:            () => (typeof PagesExtra !== 'undefined' ? PagesExtra.renderFrete()   : comingSoon('FRETES','🚚')),
  'painel-anfitriao':() => (typeof RentalHost !== 'undefined' ? RentalHost.render()                     : comingSoon('PAINEL DO ANFITRIÃO','🗝️')),
  'minhas-reservas': () => (typeof RentalGuest!== 'undefined' ? RentalGuest.render()                    : comingSoon('MINHAS RESERVAS','📋')),
  'painel-prestador':() => (typeof Monetization!=='undefined' ? Monetization.renderProviderDashboard()  : comingSoon('PAINEL DO PRESTADOR','🛠️')),
  'cadastro-parceiro':() => (typeof Monetization!=='undefined' ? Monetization.renderCadastroParceiro()   : comingSoon('CADASTRO DE PARCEIRO','🔧')),
  'admin-aprovacao': () => (typeof AdminApproval!=='undefined'? AdminApproval.render()                   : comingSoon('APROVAÇÃO DE PRESTADORES','✅')),
  'admin-anuncios':  () => (typeof AdminApproval!=='undefined'? AdminApproval.renderListings()            : comingSoon('APROVAÇÃO DE ANÚNCIOS','🚗')),
  'meus-anuncios':   () => App.navigate('dashboard'),  // alias → dashboard tem seção de anúncios
  conversas:         () => (typeof ChatDM !== 'undefined' ? ChatDM.renderInbox('main')            : comingSoon('CONVERSAS','💬')),
  'chat-thread':     () => (typeof ChatDM !== 'undefined' ? ChatDM.renderThread('main', window.__mobyaListingId) : comingSoon('CONVERSA','💬')),
  notificacoes:      () => (typeof NotificacoesPage!=='undefined' ? NotificacoesPage.render()            : comingSoon('NOTIFICAÇÕES','🔔')),
  carteira:          () => (typeof WalletPage!=='undefined'        ? WalletPage.render()                 : comingSoon('CARTEIRA','💳')),
  'ultra-gps':       () => (typeof UltraGPS  !=='undefined'        ? UltraGPS.render()                   : comingSoon('ULTRA GPS','🛣️')),
  garagem:           () => (typeof Pages     !=='undefined' && Pages.renderGaragem ? Pages.renderGaragem() : comingSoon('MINHA GARAGEM','🚗')),
  monetizacao:       () => (typeof PagesMon  !=='undefined' && PagesMon.renderMonetizacao ? PagesMon.renderMonetizacao() : comingSoon('SEJA UM PARCEIRO','🤝')),
  'painel-receita':  () => (typeof PagesMon  !=='undefined' && PagesMon.renderPainelReceita ? PagesMon.renderPainelReceita() : comingSoon('PAINEL DE RECEITA','📊')),
};

window.renderPage = function(page) {
  document.querySelectorAll('.sb-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.nb').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  window.scrollTo({ top:0, behavior:'instant' });
  const handler = BASE_PAGES[page];
  if (handler) {
    try { handler(); } catch(e) {
      console.error('Erro ao renderizar página', page, e);
      const m = document.getElementById('main');
      if (m) m.innerHTML = `<pre style="color:red;padding:20px;font-size:11px">${e}\n${e.stack||''}</pre>`;
    }
  } else {
    comingSoon((page||'PÁGINA').toUpperCase());
  }
};

window.App = (() => {
  let currentPage = 'home';

  function navigate(page, param) {
    currentPage = page;
    if (param !== undefined) window.__mobyaListingId = param;
    if (history.state?.page !== page) {
      history.pushState({ page }, '', `#${page}`);
    }
    closeMenu();
    window.renderPage(page);
  }

  function toast(msg, type='info', duration) { Toast.show(msg, type, duration); }
  function getCurrentPage() { return currentPage; }

  function closeMenu() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('header')?.classList.remove('menu-open');
  }

  function toggleMenu() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('header')?.classList.toggle('menu-open');
  }
  window.toggleMenu = toggleMenu;

  // Alias usado pelo botão "Menu" da bottom-nav (mobile). O botão era
  // referenciado no HTML (onclick="toggleBnMenu()") mas a função nunca
  // existia — todo clique lançava ReferenceError e nada acontecia.
  window.toggleBnMenu = toggleMenu;

  let _backPressedAt = 0;
  window.addEventListener('popstate', (e) => {
    const page = e.state?.page || (location.hash||'#home').replace('#','') || 'home';

    // Se já está na home e aperta voltar — duplo toque para sair
    if (page === 'home' || !e.state) {
      const now = Date.now();
      if (now - _backPressedAt < 2000) {
        // segundo toque dentro de 2s — deixa o browser sair
        return;
      }
      _backPressedAt = now;
      // empurra home de volta pro histórico para interceptar próximo toque
      history.pushState({ page: 'home' }, '', '#home');
      Toast.show('Toque novamente para sair', 'info', 2000);
      currentPage = 'home';
      window.renderPage('home');
      return;
    }

    currentPage = page;
    window.renderPage(page);
  });

  function bindNavigation() {
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const page = el.dataset.page;
        if (page) navigate(page);
      });
    });
    document.addEventListener('click', ev => {
      const sidebar = document.getElementById('sidebar');
      const btnDesktop = document.getElementById('btnMenu');
      const btnMobile  = document.getElementById('bnMenuBtn');
      if (!sidebar || !sidebar.classList.contains('open')) return;
      // Usa closest() em vez de comparação estrita: os botões têm <span>
      // internos (ícone + label), então ev.target quase sempre é o filho,
      // não o <button> em si — a comparação estrita antiga deixava o
      // listener de "clique fora" fechar o menu no mesmo clique que abria.
      if (sidebar.contains(ev.target)) return;
      if (btnDesktop && ev.target.closest('#btnMenu')) return;
      if (btnMobile  && ev.target.closest('#bnMenuBtn')) return;
      closeMenu();
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
    const fill = document.getElementById('lsFill');
    const label = document.getElementById('lsTxt');
    if (fill) fill.style.width = `${pct}%`;
    if (label && txt) label.textContent = txt;
  }

  async function init() {
    setLoadingProgress(30, 'Montando interface...');
    bindNavigation();

    if (typeof Monetization !== 'undefined' && typeof Monetization.init === 'function') {
      try { Monetization.init(); } catch(e) { console.warn('Monetization init falhou', e); }
    }

    const initial = (location.hash || '#home').replace('#','') || 'home';
    setLoadingProgress(60, 'Restaurando sessao...');

    if (typeof MobyaAuth !== 'undefined') {
      try { await Promise.race([MobyaAuth.init(), new Promise(r => setTimeout(r, 3000))]); } catch {}
    }

    setLoadingProgress(100, 'Pronto.');
    navigate(initial);
    setTimeout(hideLoadingScreen, 300);

    setTimeout(async () => {
      try { await Promise.race([API.ping(), new Promise(r => setTimeout(r, 8000))]); } catch {}
      if (typeof KeepAlive !== 'undefined') KeepAlive.init();
      else setInterval(() => API.ping().catch(() => {}), 60000);
    }, 200);
  }

  return { navigate, toast, getCurrentPage, toggleMenu, init };
})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { document.getElementById('ls')?.remove(); }, 8000);
  App.init().catch(err => {
    console.error('Falha ao iniciar MOBYA', err);
    Toast.show('Erro ao iniciar o motor quântico.', 'err', 6000);
    document.getElementById('ls')?.remove();
  });
});

// ── SIDEBAR ROLES fallback (se admin-approval.js falhar no load) ──
if (typeof window.updateSidebarRoles === 'undefined') {
  window.updateSidebarRoles = function(user) {
    const isMechanic = user && ['MECHANIC','INSURER','SELLER'].includes(user.role);
    const isAdmin    = user && ['ADMIN','SUPER_ADMIN'].includes(user.role);
    const isLoggedIn = !!user;
    const sbP = document.getElementById('sbPainelPrestador');
    if (sbP) sbP.style.display = (isMechanic || isAdmin) ? '' : 'none';
    const sbC = document.getElementById('sbCarteira');
    if (sbC) sbC.style.display = isLoggedIn ? '' : 'none';
    const sbA = document.getElementById('sbAdminAprov');
    if (sbA) sbA.style.display = isAdmin ? '' : 'none';
    const sbR = document.getElementById('sbPainelReceita');
    if (sbR) sbR.style.display = isAdmin ? '' : 'none';
    const sbAnf = document.getElementById('sbPainelAnfitriao');
    if (sbAnf) sbAnf.style.display = isLoggedIn ? '' : 'none';
    const sbRes = document.getElementById('sbMinhasReservas');
    if (sbRes) sbRes.style.display = isLoggedIn ? '' : 'none';
    const sbConv = document.getElementById('sbConversas');
    if (sbConv) sbConv.style.display = isLoggedIn ? '' : 'none';
  };
}

