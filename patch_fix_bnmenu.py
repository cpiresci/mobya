#!/usr/bin/env python3
"""
Patch: corrige o botão de menu da bottom-nav mobile.
O botão #bnMenuBtn chama toggleBnMenu(), função que nunca existiu em
nenhum arquivo JS do projeto — por isso o menu não abre no celular
(onde o .btn-menu do topo fica escondido via CSS em <=768px).

Fix: expõe window.toggleBnMenu como alias de toggleMenu(), reaproveitando
a lógica que já funciona (abre/fecha #sidebar + #header.menu-open).

Uso (Termux), a partir da raiz do repo mobya-master:
  cp ~/storage/downloads/patch_fix_bnmenu.py .
  python3 patch_fix_bnmenu.py
"""
import sys

PATH = "js/app.js"

def abort(msg):
    print(f"❌ ABORT: {msg}")
    sys.exit(1)

def str_replace(path, old, new, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(old)
    if count == 0:
        abort(f"[{label}] trecho não encontrado em {path} — nada foi alterado.")
    if count > 1:
        abort(f"[{label}] trecho encontrado {count}x em {path} (esperado 1x) — abortando.")
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ [{label}] aplicado.")

old = """  function toggleMenu() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('header')?.classList.toggle('menu-open');
  }
  window.toggleMenu = toggleMenu;"""

new = """  function toggleMenu() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('header')?.classList.toggle('menu-open');
  }
  window.toggleMenu = toggleMenu;
  // Fix: #bnMenuBtn (item "Menu" da bottom-nav mobile) chamava
  // toggleBnMenu(), função que nunca existiu — menu não abria no celular.
  window.toggleBnMenu = toggleMenu;"""

str_replace(PATH, old, new, "toggleBnMenu -> alias de toggleMenu")
print("\n🎉 Patch aplicado com sucesso em", PATH)
