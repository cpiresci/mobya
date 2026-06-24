#!/usr/bin/env python3
"""
Patch: corrige o "blink" do menu mobile.
O listener de "clicar fora fecha o menu" só ignorava cliques no botão
desktop (#btnMenu) — clique no botão mobile (#bnMenuBtn) abria o menu
E imediatamente fechava de novo no mesmo evento (bolha até o document).

Uso (Termux), a partir da raiz do repo mobya-master:
  cp ~/storage/downloads/patch_fix_menu_blink.py .
  python3 patch_fix_menu_blink.py
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

old = """    document.addEventListener('click', ev => {
      const sidebar = document.getElementById('sidebar');
      const btn = document.getElementById('btnMenu');
      if (!sidebar || !sidebar.classList.contains('open')) return;
      if (sidebar.contains(ev.target) || ev.target === btn) return;
      closeMenu();
    });"""

new = """    document.addEventListener('click', ev => {
      const sidebar = document.getElementById('sidebar');
      const btn = document.getElementById('btnMenu');
      const bnBtn = document.getElementById('bnMenuBtn');
      if (!sidebar || !sidebar.classList.contains('open')) return;
      if (sidebar.contains(ev.target) || ev.target === btn || ev.target.closest?.('#btnMenu, #bnMenuBtn')) return;
      closeMenu();
    });"""

str_replace(PATH, old, new, "menu blink fix (#bnMenuBtn reconhecido)")
print("\n🎉 Patch aplicado com sucesso em", PATH)
