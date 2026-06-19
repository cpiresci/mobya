#!/usr/bin/env python3
import os, sys
BASE = os.path.dirname(os.path.abspath(__file__))

def patch_file(rel_path, ops):
    path = os.path.join(BASE, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    for i, (old, new) in enumerate(ops, 1):
        if old not in src:
            print(f"[ERRO] bloco #{i} NAO encontrado. Abortando.")
            sys.exit(1)
        src = src.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f"[OK] {rel_path} — {len(ops)} substituicao(oes).")

JS_OLD_NAVIGATE = """  let currentPage = 'home';

  function navigate(page, param) {
    const leaving = currentPage;
    currentPage = page;
    if (param !== undefined) window.__mobyaListingId = param;
    history.replaceState(null, '', `#${page}`);
    closeMenu();

    // Reset do HomeChat ao sair da home
    if (leaving === 'home' && page !== 'home') {
      if (typeof HomeChat !== 'undefined' && HomeChat.reset) HomeChat.reset();
    }

    window.renderPage(page);
  }"""

JS_NEW_NAVIGATE = """  let currentPage = 'home';
  let _firstNav = true;

  function navigate(page, param) {
    const leaving = currentPage;
    currentPage = page;
    if (param !== undefined) window.__mobyaListingId = param;
    if (_firstNav) {
      history.replaceState({ page }, '', `#${page}`);
      _firstNav = false;
    } else {
      history.pushState({ page }, '', `#${page}`);
    }
    closeMenu();
    if (leaving === 'home' && page !== 'home') {
      if (typeof HomeChat !== 'undefined' && HomeChat.reset) HomeChat.reset();
    }
    window.renderPage(page);
  }"""

JS_OLD_INIT = """  async function init() {
    setLoadingProgress(30, 'Montando interface...');
    bindNavigation();

    if (typeof Monetization!=='undefined' && typeof Monetization.init==='function') {
      try { Monetization.init(); } catch(e) { console.warn('Monetization init falhou', e); }
    }

    const initial = (location.hash || '#home').replace('#','') || 'home';
    setLoadingProgress(100, 'Pronto.');
    navigate(initial);
    setTimeout(hideLoadingScreen, 300);

    setTimeout(async () => {
      try { await Promise.race([API.ping(), new Promise(r => setTimeout(r,8000))]); } catch {}
      if (typeof MobyaAuth !== 'undefined') {
        try { await Promise.race([MobyaAuth.init(), new Promise(r => setTimeout(r,8000))]); } catch {}
      }
      setInterval(() => API.ping().catch(()=>{}), 60000);
    }, 200);
  }"""

JS_NEW_INIT = """  async function init() {
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
      const page = ev.state?.page || (location.hash || '#home').replace('#','') || 'home';
      const leaving = currentPage;
      currentPage = page;
      if (leaving === 'home' && page !== 'home') {
        if (typeof HomeChat !== 'undefined' && HomeChat.reset) HomeChat.reset();
      }
      closeMenu();
      window.renderPage(page);
    });

    const initial = (location.hash || '#home').replace('#','') || 'home';
    setLoadingProgress(100, 'Pronto.');
    navigate(initial);
    setTimeout(hideLoadingScreen, 300);
    setInterval(() => API.ping().catch(()=>{}), 60000);
  }"""

if __name__ == '__main__':
    patch_file('js/app.js', [
        (JS_OLD_NAVIGATE, JS_NEW_NAVIGATE),
        (JS_OLD_INIT, JS_NEW_INIT),
    ])
    print("Patch concluido.")
