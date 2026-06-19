#!/usr/bin/env python3
# ============================================================
# MOBYA — patch_mobya_home_nexus_merge.py
# Mescla o chat-mega NEXUS (vivo, funcional) dentro da home
# premium (super-app), no lugar do "AI BANNER" estático que só
# levava pra /chat. Resultado: home premium continua com busca,
# SOS, categorias e prova social — mas ganha IA conversacional
# ao vivo embutida, diferencial que nenhum concorrente tem.
#
# Rodar a partir da raiz do repo "mobya-master" (frontend):
#   python3 patch_mobya_home_nexus_merge.py
#
# Idempotente: se já aplicado, avisa e não faz nada.
# ============================================================

import sys
from pathlib import Path

JS_PATH = Path("js/home-premium.js")
CSS_PATH = Path("css/home-premium.css")


def fail(msg):
    print(f"❌ {msg}")
    sys.exit(1)


def patch_js():
    if not JS_PATH.exists():
        fail(f"Não encontrei {JS_PATH} — rode este script na raiz do repo mobya-master.")

    src = JS_PATH.read_text(encoding="utf-8")

    already_marker = 'id="homeChatMega"'
    if already_marker in src:
        print(f"⚠️  {JS_PATH}: já contém '{already_marker}' — patch do banner parece já aplicado, pulando.")
        return False

    old_banner = '''        <!-- AI BANNER -->
        <div class="hp-ai" onclick="renderPage('chat')">
          <div class="hp-ai-scan"></div>
          <div class="hp-ai-pip"><div class="hp-pip-dot"></div>NEXUS-CORE · 9 AGENTES QUÂNTICOS</div>
          <div class="hp-ai-ttl">Consulte a <em>IA do MOBYA</em></div>
          <div class="hp-ai-sub">Diagnóstico de falhas, score anti-fraude, simulação de financiamento, análise FIPE e assistência de emergência — tudo em linguagem natural.</div>
          <div class="hp-ai-agents">
            <span class="hp-ai-chip">NEXUS-CV</span>
            <span class="hp-ai-chip">NEXUS-PD</span>
            <span class="hp-ai-chip">NEXUS-SEG</span>
            <span class="hp-ai-chip">NEXUS-FIN</span>
            <span class="hp-ai-chip">NEXUS-RBQ</span>
            <span class="hp-ai-chip">NEXUS-CHV</span>
          </div>
          <button class="hp-ai-cta" onclick="event.stopPropagation();renderPage('chat')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z" fill="white"/></svg>
            Perguntar à IA
          </button>
        </div>'''

    new_chat_section = '''        <!-- NEXUS LIVE CHAT — embutido na home (substitui banner estático) -->
        <section class="hp-sec hp-sec-chat">
          <div class="hp-sec-hd">
            <span class="hp-sec-ttl">⬡ CONSULTE A IA NEXUS</span>
            <span class="hp-sec-lnk" style="cursor:default;opacity:.65">9 agentes · ao vivo</span>
          </div>

          <div class="qchat-mega hp-chat-embed" id="homeChatMega">
            <div class="qcm-head">
              <div class="qcm-orb" id="qcmOrb">⬡</div>
              <div class="qcm-info">
                <div class="qcm-name" id="qcmName">NEXUS-CORE</div>
                <div class="qcm-desc" id="qcmDesc">Orquestrador · 9 agentes especializados</div>
              </div>
              <div class="qcm-status"><div class="q-dot"></div>ONLINE</div>
              <div class="qcm-provider" id="qcmProvider">–</div>
            </div>

            <div class="qcm-chips" id="qcmChips"></div>
            <div class="qcm-examples" id="qcmExamples"></div>
            <div class="qcm-msgs" id="qcmMsgs"></div>

            <div class="qcm-input-wrap">
              <div class="qcm-input-box">
                <textarea class="qcm-textarea" id="qcmTextarea" rows="2"
                  placeholder="Pergunte qualquer coisa sobre veículos…"
                  onkeydown="HomeChat.key(event)"
                  oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,160)+'px'"
                ></textarea>
                <div class="qcm-input-footer">
                  <div class="qcm-input-hint">
                    <span>Enter para enviar</span>
                    <span>Shift+Enter nova linha</span>
                  </div>
                  <button class="qcm-send" id="qcmSend" onclick="HomeChat.send()">
                    <span class="qcm-send-ico">➤</span>
                    <span class="qcm-send-txt">CONSULTAR IA</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>'''

    if old_banner not in src:
        fail(f"Bloco do AI BANNER não encontrado em {JS_PATH} (formato pode ter mudado — confira manualmente).")

    src = src.replace(old_banner, new_chat_section, 1)

    old_tail = '''    requestAnimationFrame(() => el.querySelector('.hp-wrap')?.classList.add('vis')); setTimeout(() => el.querySelector('.hp-wrap')?.classList.add('vis'), 50); el.querySelector('.hp-wrap')?.classList.add('vis');
    bindHomePremiumEvents();
    loadHomePremiumData();
  }'''

    new_tail = '''    requestAnimationFrame(() => el.querySelector('.hp-wrap')?.classList.add('vis')); setTimeout(() => el.querySelector('.hp-wrap')?.classList.add('vis'), 50); el.querySelector('.hp-wrap')?.classList.add('vis');
    bindHomePremiumEvents();
    loadHomePremiumData();

    // Inicializa o chat NEXUS embutido (flag interna impede re-init ao voltar pra home)
    if (typeof window.HomeChat !== 'undefined' && window.HomeChat.init) {
      window.HomeChat.init();
    }
  }'''

    if old_tail not in src:
        fail(f"Trecho de inicialização (fim de renderHomePremium) não encontrado em {JS_PATH}.")

    src = src.replace(old_tail, new_tail, 1)

    JS_PATH.write_text(src, encoding="utf-8")
    print(f"✅ {JS_PATH}: AI banner estático substituído pelo chat NEXUS ao vivo + HomeChat.init() adicionado.")
    return True


def patch_css():
    if not CSS_PATH.exists():
        fail(f"Não encontrei {CSS_PATH} — rode este script na raiz do repo mobya-master.")

    src = CSS_PATH.read_text(encoding="utf-8")

    marker = ".hp-chat-embed"
    if marker in src:
        print(f"⚠️  {CSS_PATH}: já contém '{marker}' — patch de CSS parece já aplicado, pulando.")
        return False

    old_tail = '''/* ─── FADE-IN ─────────────────────────── */
.hp-fu { opacity:1; transform:none; }
.hp-fu.vis { opacity:1; transform:none; }'''

    new_tail = '''/* ─── FADE-IN ─────────────────────────── */
.hp-fu { opacity:1; transform:none; }
.hp-fu.vis { opacity:1; transform:none; }

/* ─── NEXUS CHAT EMBUTIDO ──────────────────────────────────────
   .qchat-mega/.qcm-* vêm de css/style.css (usado originalmente como
   hero full-screen da home antiga). Aqui ele é só mais uma seção
   da home premium, então sobrescrevemos a altura para caber no fluxo
   do super-app em vez de ocupar quase a viewport inteira. ────────── */
.hp-wrap .qchat-mega.hp-chat-embed {
  min-height: 420px;
  max-height: 560px;
  border-radius: 18px;
}
.hp-wrap .qcm-msgs { min-height: 140px; }

@media (max-width:640px) {
  .hp-wrap .qchat-mega.hp-chat-embed { min-height:380px; max-height:480px; }
}'''

    if old_tail not in src:
        fail(f"Bloco FADE-IN não encontrado no fim de {CSS_PATH} — confira manualmente.")

    src = src.replace(old_tail, new_tail, 1)
    CSS_PATH.write_text(src, encoding="utf-8")
    print(f"✅ {CSS_PATH}: altura do chat embutido ajustada para caber no fluxo da home.")
    return True


if __name__ == "__main__":
    print("=== MOBYA: mesclando NEXUS chat-mega na home premium ===\n")
    js_changed = patch_js()
    css_changed = patch_css()

    if js_changed or css_changed:
        print("\n✅ Patch aplicado. Próximos passos:")
        print("   git add js/home-premium.js css/home-premium.css")
        print("   git commit -m 'feat(home): mescla chat NEXUS ao vivo na home premium'")
        print("   git push")
    else:
        print("\nNada a fazer — repo já estava com o patch aplicado.")
