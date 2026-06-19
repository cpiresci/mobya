#!/usr/bin/env python3
# ============================================================
# MOBYA — patch_mobya_home_chat_funnel_fix.py
# Corrige a redundância do funil criada pelo merge anterior:
# o botão de IA do hero e o orb "Chat IA" do grid de Serviços
# levavam pra /chat (página cheia, separada), em vez de usar o
# chat NEXUS que já está embutido na própria home.
# Agora os dois rolam até #homeChatMega e focam o textarea —
# e se o usuário já tiver digitado algo na busca do hero, o
# texto é herdado pro campo do chat.
#
# PRÉ-REQUISITO: rodar DEPOIS do patch_mobya_home_nexus_merge.py
# (precisa do #homeChatMega já embutido na home).
#
# Rodar a partir da raiz do repo "mobya-master" (frontend):
#   python3 patch_mobya_home_chat_funnel_fix.py
#
# Idempotente: se já aplicado, avisa e não faz nada.
# ============================================================

import sys
from pathlib import Path

JS_PATH = Path("js/home-premium.js")


def fail(msg):
    print(f"❌ {msg}")
    sys.exit(1)


def main():
    if not JS_PATH.exists():
        fail(f"Não encontrei {JS_PATH} — rode este script na raiz do repo mobya-master.")

    src = JS_PATH.read_text(encoding="utf-8")

    already_marker = "HomePremium.focusChat()"
    if already_marker in src:
        print(f"⚠️  {JS_PATH}: já contém '{already_marker}' — funnel fix parece já aplicado, pulando.")
        return False

    prereq_marker = 'id="homeChatMega"'
    if prereq_marker not in src:
        fail(
            f"{JS_PATH} ainda não tem '{prereq_marker}'. "
            "Rode primeiro o patch_mobya_home_nexus_merge.py."
        )

    changed = False

    # 1) orb "Chat IA" do grid de Serviços
    old_svcorb = '''  function svcOrb(svc) {
    return `
      <div class="hp-svc-item" onclick="renderPage('${svc.page}')">
        <div class="hp-orb ${svc.cls}">
          <div class="hp-orb-bg"></div>
          ${icon(svc.icon)}
        </div>
        <span class="hp-svc-lbl">${svc.label}</span>
      </div>`;
  }'''

    new_svcorb = '''  function svcOrb(svc) {
    const action = svc.page === 'chat' ? 'HomePremium.focusChat()' : `renderPage('${svc.page}')`;
    return `
      <div class="hp-svc-item" onclick="${action}">
        <div class="hp-orb ${svc.cls}">
          <div class="hp-orb-bg"></div>
          ${icon(svc.icon)}
        </div>
        <span class="hp-svc-lbl">${svc.label}</span>
      </div>`;
  }'''

    if old_svcorb in src:
        src = src.replace(old_svcorb, new_svcorb, 1)
        changed = True
        print("✅ svcOrb(): orb 'Chat IA' agora chama HomePremium.focusChat().")
    else:
        print("⚠️  svcOrb() não bateu com o formato esperado — confira manualmente (pode já estar diferente).")

    # 2) botão de IA na busca do hero
    old_btn = '''<button class="hp-srch-ai" title="Buscar com IA" onclick="renderPage('chat')">'''
    new_btn = '''<button class="hp-srch-ai" title="Buscar com IA" onclick="HomePremium.focusChat()">'''

    if old_btn in src:
        src = src.replace(old_btn, new_btn, 1)
        changed = True
        print("✅ Botão de IA do hero agora chama HomePremium.focusChat().")
    else:
        print("⚠️  Botão hp-srch-ai não bateu com o formato esperado — confira manualmente.")

    # 3) adiciona focusChat() e atualiza o export window.HomePremium
    old_export = "  window.HomePremium = { toggleFavorite };"
    new_export = '''  // ── FOCO NO CHAT NEXUS EMBUTIDO (substitui navegação pra /chat) ─
  function focusChat() {
    const chatEl = document.getElementById('homeChatMega');
    if (!chatEl) { renderPage('chat'); return; } // fallback de segurança

    chatEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
      const ta = document.getElementById('qcmTextarea');
      const srch = document.getElementById('hpSrchInput');
      if (ta && srch && srch.value.trim()) {
        ta.value = srch.value.trim();
        ta.dispatchEvent(new Event('input'));
      }
      ta?.focus();
    }, 450);
  }

  window.HomePremium = { toggleFavorite, focusChat };'''

    if old_export in src:
        src = src.replace(old_export, new_export, 1)
        changed = True
        print("✅ focusChat() adicionada e exportada em window.HomePremium.")
    else:
        fail(f"Linha 'window.HomePremium = {{ toggleFavorite }};' não encontrada em {JS_PATH}.")

    if changed:
        JS_PATH.write_text(src, encoding="utf-8")

    return changed


if __name__ == "__main__":
    print("=== MOBYA: corrigindo funil — gatilhos de IA da home → chat embutido ===\n")
    if main():
        print("\n✅ Patch aplicado. Próximos passos:")
        print("   git add js/home-premium.js")
        print("   git commit -m 'fix(home): unifica gatilhos de IA no chat NEXUS embutido (funil)'")
        print("   git push")
    else:
        print("\nNada a fazer — repo já estava com o patch aplicado.")
