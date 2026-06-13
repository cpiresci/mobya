// ============================================================
// MOBYA — app.js  (Quantum Engine v3.0)
// Orquestrador final: bootstrap, router, lifecycle, toast,
// sidebar, menu mobile, status bar, auth state.
// Depende de: api.js, auth.js, pages.js, chat.js, calc.js,
//             monetization.js
// ============================================================

// ── NAMESPACE GLOBAL App ────────────────────────────────────
window.App = (() => {

  // ── TOAST SYSTEM ──────────────────────────────────────────
  function toast(msg, type = 'ok') {
    const colors = {
      ok:   { bg:'rgba(16,185,129,.14)',  border:'rgba(16,185,129,.4)',  text:'var(--green)' },
      err:  { bg:'rgba(244,63,94,.14)',   border:'rgba(244,63,94,.4)',   text:'var(--red)'   },
      warn: { bg:'rgba(251,191,36,.11)',  border:'rgba(251,191,36,.35)', text:'var(--gold)'  },
      info: { bg:'rgba(0,245,255,.09)',   border:'rgba(0,245,255,.3)',   text:'var(--neon)'  },
    };
    const c = colors[type] || colors.info;
    const t = document.createElement('div');
    t.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:9999;
      padding:13px 20px;border-radius:10px;
      font-family:'Space Grotesk',sans-serif;font-size:.82rem;font-weight:500;
      max-width:360px;line-height:1.45;
      background:${c.bg};border:1px solid ${c.border};color:${c.text};
      backdrop-filter:blur(14px);box-shadow:0 8px 28px rgba(0,0,0,.45);
      animation:slideIn .28s ease;pointer-events:none`;
    t.textContent = msg;
    // inject keyframe once
    if (!document.getElementById('toastKF')) {
      const s = document.createElement('style');
      s.id = 'toastKF';
      s.textContent = `
        @keyframes slideIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes scanLine { from { transform:translateX(-100%) } to { transform:translateX(100%) } }
        @keyframes pulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }`;
      document.head.appendChild(s);
    }
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s';
      t.style.opacity    = '0';
      setTimeout(() => t.remove(), 320);
    }, 3600);
  }

  // ── LOADING SCREEN ────────────────────────────────────────
  const LOAD_STEPS = [
    'Iniciando motor quântico...',
    'Carregando 9 agentes NEXUS...',
    'Conectando provedores de IA...',
    'Sincronizando marketplace...',
    'Ativando motor de monetização...',
    'MOBYA ONLINE ✓',
  ];

  function runLoader() {
    const fill = document.getElementById('lsFill');
    const txt  = document.getElementById('lsTxt');
    if (!fill || !txt) return Promise.resolve();

    return new Promise(resolve => {
      let step = 0;
      const tick = () => {
        if (step >= LOAD_STEPS.length) {
          const ls = document.getElementById('ls');
          if (ls) {
            ls.style.transition = 'opacity .5s';
            ls.style.opacity    = '0';
            setTimeout(() => { ls.style.display = 'none'; resolve(); }, 520);
          } else {
            resolve();
          }
          return;
        }
        fill.style.width = `${Math.round((step + 1) / LOAD_STEPS.length * 100)}%`;
        txt.textContent  = LOAD_STEPS[step];
        step++;
        setTimeout(tick, step === LOAD_STEPS.length ? 350 : 280);
      };
      tick();
    });
  }

  // ── API STATUS BAR ────────────────────────────────────────
  async function checkApiStatus() {
    const dot  = document.getElementById('apiDot');
    const txt  = document.getElementById('apiTxt');
    const sbEls = {
      sambanova:  document.getElementById('sbSambanova'),
      cerebras:   document.getElementById('sbCerebras'),
      gemini:     document.getElementById('sbGemini'),
      openrouter: document.getElementById('sbOpenRouter'),
    };

    try {
      const r = await API.health();
      const status = r?.data || r || {};

      // Header dot
      const online = status.status === 'ok' || status.online;
      if (dot) { dot.style.background = online ? 'var(--green)' : 'var(--gold)'; }
      if (txt) { txt.textContent = online ? 'ONLINE' : 'PARCIAL'; }

      // Sidebar provider dots
      const providers = status.providers || {};
      Object.entries(sbEls).forEach(([key, el]) => {
        if (!el) return;
        const on = providers[key]?.configured || providers[key]?.ok;
        el.style.color  = on ? 'var(--green)' : 'var(--muted)';
        el.textContent  = on ? '● ATIVO' : '● OFF';
      });
    } catch {
      if (dot) dot.style.background = 'var(--red)';
      if (txt) txt.textContent = 'OFFLINE';
    }
  }

  // ── ROUTER ────────────────────────────────────────────────
  // Mapa de page-id → renderer
  const ROUTE_MAP = {
    // Core
    'home':          () => Pages.renderHome(),
    'classificados': () => Pages.renderClassificados(),
    'agentes':       () => Pages.renderAgentes(),
    'chat':          () => Pages.renderAgentes(),   // alias
    'emergencia':    () => Pages.renderEmergencia(),
    'calculadoras':  () => Pages.renderCalculadoras(),
    'vistoria':      () => Pages.renderVistoria(),
    'documentacao':  () => Pages.renderDocumentacao(),
    'dashboard':     () => Pages.renderDashboard(),

    // Aliases sidebar
    'pecas':         () => Pages.renderClassificados(),
    'aluguel':       () => Pages.renderClassificados(),
    'servicos':      () => Pages.renderClassificados(),
    'reboque':       () => Pages.renderEmergencia(),
    'chaveiro':      () => Pages.renderEmergencia(),
    'seguros':       () => renderPage('seguros-sim'),
    'financiamento': () => Pages.renderCalculadoras(),

    // Monetização (delegado para monetization.js)
    'monetizacao':   () => typeof Monetization !== 'undefined'
                             ? Monetization._pages?.renderPartnersPage?.()  || renderPage_monetizacao('monetizacao')
                             : Pages.renderHome(),
    'seguros-sim':   () => renderPage_monetizacao('seguros-sim'),
    'fretes':        () => renderPage_monetizacao('fretes'),
    'painel-receita':() => renderPage_monetizacao('painel-receita'),
  };

  // Monetization pages são registradas pelo próprio módulo via window.renderPage override,
  // mas precisamos de um fallback limpo aqui também:
  function renderPage_monetizacao(page) {
    if (typeof Monetization === 'undefined') {
      App.toast('Módulo de monetização não carregado.', 'err'); return;
    }
    // O módulo monetization.js sobrescreve window.renderPage — invocar diretamente
    const origPages = {
      'monetizacao':    '_renderPartners',
      'seguros-sim':    '_renderInsurance',
      'fretes':         '_renderLogistics',
      'painel-receita': '_renderRevenue',
    };
    const fn = origPages[page];
    if (fn && typeof Monetization[fn] === 'function') {
      Monetization[fn]();
    }
  }

  // Histórico de navegação leve (sem hash routing complexo)
  let _currentPage = 'home';

  window.renderPage = function(page) {
    _currentPage = page;

    // Atualiza nav ativo
    document.querySelectorAll('.nb').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page || (page.startsWith('listing-') && b.dataset.page==='classificados'));
    });
    document.querySelectorAll('.sb-item').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page);
    });

    // Scroll main ao topo
    const m = document.getElementById('main');
    if (m) m.scrollTop = 0;

    // Fechar menu mobile se aberto
    closeMobileMenu();

    // Rota para listing dinâmico
    if (page.startsWith('listing-')) {
      const id = page.slice(8);
      Pages.renderListing(id);
      return;
    }

    // Lookup no mapa
    const renderer = ROUTE_MAP[page];
    if (renderer) {
      renderer();
    } else {
      // Delega para Monetization se ele sobrescreveu
      // (caso o módulo tenha registrado pages extras)
      App.toast(`Página "${page}" não encontrada.`, 'warn');
      Pages.renderHome();
    }
  };

  // ── SIDEBAR NAV (clique em .sb-item) ─────────────────────
  function bindSidebarItems() {
    document.querySelectorAll('.sb-item[data-page]').forEach(item => {
      item.addEventListener('click', () => renderPage(item.dataset.page));
    });
  }

  // ── TOP NAV BUTTONS ───────────────────────────────────────
  function bindNavButtons() {
    document.querySelectorAll('.nb[data-page]').forEach(btn => {
      btn.addEventListener('click', () => renderPage(btn.dataset.page));
    });
  }

  // ── MOBILE MENU ───────────────────────────────────────────
  window.toggleMenu = function() {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const open = sb.classList.toggle('open');
    // Overlay
    let ov = document.getElementById('menuOverlay');
    if (open) {
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'menuOverlay';
        ov.style.cssText = `position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.5);
          backdrop-filter:blur(4px)`;
        ov.addEventListener('click', closeMobileMenu);
        document.body.appendChild(ov);
      }
    } else {
      ov?.remove();
    }
  };

  function closeMobileMenu() {
    const sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    document.getElementById('menuOverlay')?.remove();
  }

  // ── AUTH STATE ────────────────────────────────────────────
  function updateAuthUI(user) {
    const btn  = document.getElementById('btnCta');
    if (!btn) return;
    if (user) {
      btn.textContent = user.name?.split(' ')[0] || 'Perfil';
      btn.onclick     = () => renderPage('dashboard');
      btn.style.background = 'rgba(16,185,129,.12)';
      btn.style.color      = 'var(--green)';
      btn.style.border     = '1px solid rgba(16,185,129,.25)';

      // Mostrar painel-receita no sidebar se admin
      if (['ADMIN','SUPER_ADMIN'].includes(user.role)) {
        const sbSec = document.querySelector('.sb-sec:last-of-type .sb-lbl');
        if (sbSec && sbSec.textContent === 'Motor de IA') {
          const adminItem = document.createElement('div');
          adminItem.className   = 'sb-item';
          adminItem.dataset.page= 'painel-receita';
          adminItem.textContent = '📊 Painel de Receita';
          adminItem.addEventListener('click', () => renderPage('painel-receita'));
          sbSec.parentElement.appendChild(adminItem);
        }
      }
    } else {
      btn.textContent = 'Entrar';
      btn.onclick     = () => window.MobyaAuth?.showLogin();
      btn.style.background = '';
      btn.style.color      = '';
      btn.style.border     = '';
    }
  }

  // ── INJECT MONETIZAÇÃO NO SIDEBAR ────────────────────────
  function injectMonetizacaoSidebar() {
    // Encontra o bloco "Plataforma" e injeta os itens de monetização
    const secs = document.querySelectorAll('.sb-sec');
    let plataforma = null;
    secs.forEach(s => {
      if (s.querySelector('.sb-lbl')?.textContent?.includes('Plataforma')) plataforma = s;
    });
    if (!plataforma) return;

    // Evita duplicar
    if (document.querySelector('[data-page="monetizacao"]')) return;

    const items = [
      { page:'monetizacao', icon:'💰', label:'Rede de Parceiros', badge:'NOVO', badgeClass:'g' },
      { page:'seguros-sim', icon:'🛡️', label:'Simulador Seguro IA' },
      { page:'fretes',      icon:'🚛', label:'Fretes & Reboques' },
    ];

    // Inserir antes do div.sb-div seguinte ao bloco plataforma
    const divider = plataforma.querySelector('.sb-div') || plataforma.nextElementSibling;

    items.forEach(it => {
      const el = document.createElement('div');
      el.className   = 'sb-item';
      el.dataset.page= it.page;
      el.innerHTML   = `${it.icon} ${it.label}${it.badge
        ? ` <span class="sb-badge ${it.badgeClass}">${it.badge}</span>`:''}`;
      el.addEventListener('click', () => renderPage(it.page));
      if (divider && divider.parentElement === plataforma) {
        plataforma.insertBefore(el, divider);
      } else {
        plataforma.appendChild(el);
      }
    });
  }

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────
  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      // Ctrl/Cmd + K → foco no chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (_currentPage !== 'agentes') renderPage('agentes');
        setTimeout(() => document.getElementById('msgInput')?.focus(), 100);
      }
      // Esc → fecha modais abertos
      if (e.key === 'Escape') {
        document.getElementById('authModal')?.classList.remove('open');
        window.Monetization?.closeQuoteModal();
        document.getElementById('createModal')?.remove();
      }
    });
  }

  // ── PWA / INSTALL PROMPT ──────────────────────────────────
  let _deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _deferredInstall = e;
    // Mostra banner sutil após 30s
    setTimeout(() => {
      if (!_deferredInstall) return;
      const banner = document.createElement('div');
      banner.style.cssText = `position:fixed;bottom:70px;left:50%;transform:translateX(-50%);
        z-index:888;background:rgba(124,58,237,.14);border:1px solid rgba(124,58,237,.3);
        border-radius:10px;padding:12px 20px;display:flex;align-items:center;gap:12px;
        backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,.4);white-space:nowrap`;
      banner.innerHTML = `<span style="font-size:.82rem;color:var(--q4)">
          📱 Instalar MOBYA no celular?</span>
        <button id="installBtn" style="background:linear-gradient(135deg,var(--q1),var(--q3));
          color:#fff;padding:6px 16px;border-radius:6px;border:none;cursor:pointer;
          font-size:.76rem;font-weight:600">Instalar</button>
        <button onclick="this.closest('div').remove()" style="background:none;border:none;
          color:var(--muted);cursor:pointer;font-size:1rem">✕</button>`;
      banner.querySelector('#installBtn').addEventListener('click', async () => {
        _deferredInstall.prompt();
        const { outcome } = await _deferredInstall.userChoice;
        _deferredInstall = null;
        banner.remove();
        if (outcome === 'accepted') toast('✅ MOBYA instalado!', 'ok');
      });
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 12000);
    }, 30000);
  });

  // ── PERIODIC REFRESH ─────────────────────────────────────
  // Revalida status da API a cada 2 minutos
  let _statusInterval = null;
  function startStatusPolling() {
    if (_statusInterval) clearInterval(_statusInterval);
    _statusInterval = setInterval(checkApiStatus, 120_000);
  }

  // ── VISIBILITY CHANGE — revalida ao voltar para a aba ────
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkApiStatus();
  });

  // ── MAIN BOOTSTRAP ───────────────────────────────────────
  async function boot() {
    try {
      // 1. Loading screen animada
      await runLoader();

      // 2. Bind navegação estática (sidebar + nav)
      bindSidebarItems();
      bindNavButtons();
      bindKeyboard();

      // 3. Inject sidebar itens de monetização
      injectMonetizacaoSidebar();

      // 4. Verifica sessão e atualiza UI de auth
      const user = await API.me().then(r => r.data || r).catch(() => null);
      updateAuthUI(user);

      // Observa eventos de auth disparados por auth.js
      window.addEventListener('mobya:login',  e => updateAuthUI(e.detail?.user));
      window.addEventListener('mobya:logout', ()  => updateAuthUI(null));

      // 5. Verifica status da API (providers IA)
      await checkApiStatus();
      startStatusPolling();

      // 6. Rende a página inicial
      const hash = location.hash.replace('#','');
      renderPage(hash || 'home');

      // 7. Handle back/forward browser
      window.addEventListener('popstate', () => {
        const p = location.hash.replace('#','') || 'home';
        renderPage(p);
      });

      // 8. Deep link: persiste hash ao navegar
      const origRender = window.renderPage;
      window.renderPage = function(page) {
        if (page && page !== 'home') {
          history.pushState(null, '', `#${page}`);
        } else {
          history.pushState(null, '', location.pathname);
        }
        origRender(page);
      };

      console.log('%cMOBYA QUANTUM ENGINE v3.0 ⬡ ONLINE', [
        'background:linear-gradient(135deg,#5b21b6,#7c3aed)',
        'color:#fff','padding:6px 14px','border-radius:6px',
        'font-family:monospace','font-size:12px','font-weight:700',
      ].join(';'));

    } catch (err) {
      console.error('[MOBYA] Boot error:', err);
      // Fallback: esconde loader e renderiza home mesmo com erro
      const ls = document.getElementById('ls');
      if (ls) ls.style.display = 'none';
      Pages.renderHome();
      toast('Motor iniciado com recursos limitados.', 'warn');
    }
  }

  // ── START ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ── API PÚBLICA ───────────────────────────────────────────
  return { toast, checkApiStatus, updateAuthUI };

})();

// ── COMPATIBILIDADE: expõe renderPage globalmente ─────────
// (chamado por links inline no HTML gerado pelas pages)
if (typeof window.renderPage === 'undefined') {
  window.renderPage = p => App && console.warn('[MOBYA] renderPage chamado antes do boot:', p);
}

// ── SERVICE WORKER (PWA) ──────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sw.js opcional — sem erro visível se ausente
    });
  });
}
