#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MOBYA — Fix: unifica roteamento em App.navigate()
Execute na raiz do repo mobya-master/:
  python3 patch_mobya_routing_fix.py

O que corrige:
  1. js/home-premium.js  — 19 chamadas onclick/JS de renderPage('x') -> App.navigate('x')
  2. js/pages.js         — 5 chamadas onclick/JS de renderPage('x') -> App.navigate('x')
  3. js/monetization.js  — remove o 2º monkey-patch morto de window.renderPage
                            (linha ~1328-1335; era sobrescrito por app.js antes de
                            qualquer clique acontecer — nunca executava em runtime)
  4. index.html          — bump do cache-bust (?v=) dos 3 arquivos tocados

Por quê: cliques que chamavam renderPage() direto não passavam por App.navigate(),
então currentPage não atualizava, history.pushState() não rodava (botão voltar
quebrava) e HomeChat.reset() disparava fora de hora. Idempotente — pode rodar
de novo sem efeito colateral.
"""
import os, re

BASE = os.path.expanduser('~/mobya-master')
if not os.path.isdir(BASE):
    BASE = os.getcwd()  # fallback: já estamos na raiz do repo

CHANGED_FILES = []


def patch(path, old, new, label):
    if not os.path.exists(path):
        print('ERRO (arquivo nao encontrado):', path)
        return
    with open(path, encoding='utf-8') as f:
        s = f.read()
    if old not in s:
        print('SKIP:', label, '(nao encontrado — ja aplicado ou arquivo mudou)')
        return
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s.replace(old, new, 1))
    print('OK:', label)
    CHANGED_FILES.append(path)


def fix_render_page_calls(rel_path, label):
    """Troca toda chamada renderPage('x') por App.navigate('x') no arquivo,
    desde que o arquivo nao defina/sobrescreva window.renderPage (guarda de
    seguranca para nao corromper o roteador real em app.js/monetization.js)."""
    path = os.path.join(BASE, rel_path)
    if not os.path.exists(path):
        print('ERRO (arquivo nao encontrado):', path)
        return
    with open(path, encoding='utf-8') as f:
        s = f.read()

    if 'window.renderPage' in s or re.search(r'function\s+renderPage\b', s):
        print(f'ABORTADO: {label} — arquivo parece DEFINIR renderPage, pulei por seguranca.')
        return

    n = s.count('renderPage(')
    if n == 0:
        print(f'SKIP: {label} (0 chamadas — ja aplicado)')
        return

    s2 = s.replace('renderPage(', 'App.navigate(')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s2)
    print(f'OK: {label} — {n} chamada(s) renderPage() -> App.navigate()')
    CHANGED_FILES.append(path)


# ── 1 e 2: unifica chamadas para App.navigate() ───────────────────────
fix_render_page_calls('js/home-premium.js', 'home-premium.js (cards/CTAs da home)')
fix_render_page_calls('js/pages.js', 'pages.js (botoes em estados vazios)')

# ── 3: remove o roteador morto em monetization.js ──────────────────────
patch(
    os.path.join(BASE, 'js/monetization.js'),
    "  });\n\n  // Registra a page no roteador\n"
    "  const origRender=window.renderPage;\n"
    "  window.renderPage=function(page){\n"
    "    if(page==='painel-prestador'){\n"
    "      document.querySelectorAll('.sb-item').forEach(el=>el.classList.toggle('active',el.dataset.page===page));\n"
    "      renderProviderDashboard();\n"
    "    } else if(origRender){ origRender(page); }\n"
    "  };\n"
    "})();",
    "  });\n\n})();",
    'monetization.js — remove 2o monkey-patch morto de window.renderPage',
)

# ── 4: cache-bust dos arquivos tocados no index.html ───────────────────
html = os.path.join(BASE, 'index.html')
for js in ('pages.js', 'home-premium.js', 'monetization.js'):
    patch(
        html,
        f'js/{js}?v=20260619d',
        f'js/{js}?v=20260619e',
        f'cache-bust {js}',
    )

# ── resumo + git ────────────────────────────────────────────────────────
print()
if not CHANGED_FILES:
    print('Nada para commitar — repo ja estava com o fix aplicado.')
else:
    os.chdir(BASE)
    os.system('git add js/home-premium.js js/pages.js js/monetization.js index.html')
    os.system('git commit -m "fix: unifica roteamento em App.navigate(), remove monkey-patch morto"')
    os.system('git push')
print('DONE!')
