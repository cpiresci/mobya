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
    print(f"[OK] {rel_path}")

JS_OLD = """    window.addEventListener('popstate', (ev) => {
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

JS_NEW = """    window.addEventListener('popstate', (ev) => {
      // Sempre reempilha um estado de seguranca para nunca ficar sem historico
      history.pushState({ page: currentPage }, '', `#${currentPage}`);

      const page = ev.state?.page || (location.hash || '#home').replace('#','') || 'home';
      if (page === currentPage) return;

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
    // Empilha estado extra na home para o popstate ter margem de seguranca
    history.pushState({ page: 'home' }, '', '#home');
    setTimeout(hideLoadingScreen, 300);

    setInterval(() => API.ping().catch(()=>{}), 60000);
  }"""

if __name__ == '__main__':
    patch_file('js/app.js', [(JS_OLD, JS_NEW)])
    print("Patch concluido.")
