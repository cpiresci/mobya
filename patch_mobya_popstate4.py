#!/usr/bin/env python3
import os, sys

BASE = os.path.expanduser('~/mobya-master')

NAV_OLD = r"""    if (_firstNav) {
      history.replaceState({ page }, '', `#${page}`);
      _firstNav = false;
    } else {
      history.pushState({ page }, '', `#${page}`);
    }"""

NAV_NEW = r"""    if (_firstNav) {
      history.replaceState({ page }, '', `#${page}`);
      history.pushState({ page }, '', `#${page}`); // colchao: garante que o 1o "voltar" dispare popstate em vez de fechar o app direto
      _firstNav = false;
    } else {
      history.pushState({ page }, '', `#${page}`);
    }"""

POP_OLD = r"""    let lastBackAtHome = 0;
    window.addEventListener('popstate', (ev) => {
      const page = ev.state?.page || (location.hash || '#home').replace('#','') || 'home';

      if (page === 'home' || !ev.state) {
        // Ainda nao estava na home: so navega pra home, nao conta como tentativa de saida
        if (currentPage !== 'home') {
          history.pushState({ page: 'home' }, '', '#home');
          currentPage = 'home';
          closeMenu();
          window.renderPage('home');
          return;
        }
        // Ja estava na home: duplo "voltar" em menos de 2s deixa o app/browser sair
        const now = Date.now();
        if (now - lastBackAtHome < 2000) {
          return;
        }
        lastBackAtHome = now;
        history.pushState({ page: 'home' }, '', '#home');
        if (typeof Toast !== 'undefined') Toast.show('Toque voltar novamente para sair do MOBYA', 'info', 2000);
        return;
      }"""

POP_NEW = r"""    window.addEventListener('popstate', (ev) => {
      const page = ev.state?.page || (location.hash || '#home').replace('#','') || 'home';

      if (page === 'home' || !ev.state) {
        // Chegando na home vindo de outra pagina: empilha 1 colchao antes de
        // permitir que o proximo "voltar" realmente saia do app
        if (currentPage !== 'home') {
          history.pushState({ page: 'home' }, '', '#home');
          currentPage = 'home';
          closeMenu();
          window.renderPage('home');
          return;
        }
        // Ja estava na home: avisa e NAO reempilha. Enquanto houver colchao no
        // historico, o proximo "voltar" cai aqui de novo; quando esgotar, o
        // app/browser sai de fato - sem depender de cronometro.
        if (typeof Toast !== 'undefined') Toast.show('Toque voltar novamente para sair do MOBYA', 'info', 1500);
        return;
      }"""


def patch_file(rel_path, replacements):
    path = os.path.join(BASE, rel_path)
    if not os.path.exists(path):
        print('[ERRO] arquivo nao encontrado:', path)
        sys.exit(1)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for i, (old, new) in enumerate(replacements, 1):
        if old not in content:
            print(f'[ERRO] bloco #{i} NAO encontrado. Abortando.')
            sys.exit(1)
        content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'OK: {rel_path} patcheado.')


if __name__ == '__main__':
    patch_file('js/app.js', [(NAV_OLD, NAV_NEW), (POP_OLD, POP_NEW)])
    print("Patch concluído.")
