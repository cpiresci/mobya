#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch: Frente H — Consulta de Placa standalone (frontend mobya-main).
Idempotente: pode rodar mais de uma vez sem quebrar nada.

Uso:
  cd ~/Mobya
  python3 frente_h_frontend_patch.py

Depois de rodar:
  1. node --check em todo .js tocado (o script já roda isso sozinho no fim,
     se o node estiver disponível no PATH do Termux).
  2. git add -A && git commit -m "Frente H: consulta de placa standalone (frontend)"
  3. Confirme a branch (`git branch --show-current` deve ser `main`) e
     git push -- LEMBRETE: backend (mobya-app) precisa estar commitado e
     pushado ANTES ou JUNTO desta sessão, nunca só o frontend sozinho.
"""
import base64
import os
import subprocess
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Mobya")

def ok(msg): print(f"[OK] {msg}")
def skip(msg): print(f"[SKIP] {msg}")
def err(msg): print(f"[ERRO] {msg}")

def write_new_file(rel_path, b64_content):
    full = os.path.join(ROOT, rel_path)
    content = base64.b64decode(b64_content).decode("utf-8")
    if os.path.exists(full):
        with open(full, "r", encoding="utf-8") as f:
            existing = f.read()
        if existing == content:
            skip(f"{rel_path} já existe e está idêntico.")
            return
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    ok(f"{rel_path} escrito.")

def str_replace(rel_path, old, new, label):
    full = os.path.join(ROOT, rel_path)
    if not os.path.exists(full):
        err(f"{rel_path} não encontrado — abortando esse patch.")
        return False
    with open(full, "r", encoding="utf-8") as f:
        content = f.read()
    if new in content:
        skip(f"{label} já aplicado em {rel_path}.")
        return True
    if old not in content:
        err(f"{label}: old_str não encontrado em {rel_path}. Confira manualmente (arquivo pode ter mudado).")
        return False
    content = content.replace(old, new, 1)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    ok(f"{label} aplicado em {rel_path}.")
    return True

def main():
    if not os.path.isdir(ROOT):
        err(f"Diretório {ROOT} não existe. Rode com o caminho certo: python3 frente_h_frontend_patch.py /caminho/do/Mobya")
        return

    # 1. Novo módulo JS da página standalone
    write_new_file("js/plate-check.js", PLATE_JS_B64)

    # 2. CSS dedicado da página
    write_new_file("css/plate-check.css", PLATE_CSS_B64)

    # 3. api.js — novo namespace vehicleCheck
    old_api_push = "  const push = {"
    new_api_push = """  const vehicleCheck = {
    standaloneCharge: (d)  => post('/vehicle-check/standalone/charge', d),
    standaloneStatus: (id) => get(`/vehicle-check/standalone/${id}/status`),
    standaloneMine:   ()   => get('/vehicle-check/standalone/mine'),
  };

  const push = {"""
    str_replace("js/api.js", old_api_push, new_api_push, "api.js: namespace vehicleCheck")

    old_api_return = "return { setToken, getToken, isAuth, get, post, put, patch, del, req: reqCompat, auth, ai, chat, listings, emergency, monetization, vehicle, wallet, notifications, rental, me, push, referral, pollEmergency, ping };"
    new_api_return = "return { setToken, getToken, isAuth, get, post, put, patch, del, req: reqCompat, auth, ai, chat, listings, emergency, monetization, vehicle, vehicleCheck, wallet, notifications, rental, me, push, referral, pollEmergency, ping };"
    str_replace("js/api.js", old_api_return, new_api_return, "api.js: expor vehicleCheck no retorno")

    # 4. app.js — nova rota no roteador
    old_route_map = """  'painel-receita':  () => (typeof PagesMon  !=='undefined' && PagesMon.renderPainelReceita ? PagesMon.renderPainelReceita() : comingSoon('PAINEL DE RECEITA','📊')),
};"""
    new_route_map = """  'painel-receita':  () => (typeof PagesMon  !=='undefined' && PagesMon.renderPainelReceita ? PagesMon.renderPainelReceita() : comingSoon('PAINEL DE RECEITA','📊')),
  'consulta-placa':  () => (typeof PlateCheck!=='undefined'        ? PlateCheck.render()                 : comingSoon('CONSULTA DE PLACA','🛡️')),
};"""
    str_replace("js/app.js", old_route_map, new_route_map, "app.js: rota consulta-placa")

    # 5. home-premium.js — ícone novo
    old_icon = """    chatia: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">"""
    new_icon = """    placa: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <path d="M24 6L36 11V22C36 31 31 37.5 24 41C17 37.5 12 31 12 22V11L24 6Z" fill="url(#hpPlc)"/>
      <path d="M24 10L32 13.5V22C32 28.5 28.7 33 24 36C19.3 33 16 28.5 16 22V13.5L24 10Z" fill="rgba(0,0,0,.22)"/>
      <rect x="17" y="20" width="14" height="8" rx="1.5" fill="rgba(0,245,255,.14)" stroke="#00f5ff" stroke-width="1.1"/>
      <text x="24" y="26" text-anchor="middle" font-family="monospace" font-size="5.4" font-weight="700" fill="#00f5ff">ABC1D23</text>
      <path d="M18.5 32.5L21.5 35.5L29.5 27" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <defs><linearGradient id="hpPlc" x1="12" y1="6" x2="36" y2="41" gradientUnits="userSpaceOnUse">
        <stop stop-color="#0e7490"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs>
    </svg>`,
    chatia: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">"""
    str_replace("js/home-premium.js", old_icon, new_icon, "home-premium.js: icone placa")

    # 6. home-premium.js — banner de destaque
    old_banner = """            <div class="hp-sos-eta">~8 min<span>estimativa</span></div>
          </div>
        </div>

        <!-- NEXUS LIVE CHAT"""
    new_banner = """            <div class="hp-sos-eta">~8 min<span>estimativa</span></div>
          </div>
        </div>

        <!-- CONSULTA OFICIAL DE PLACA — Frente H (08/07/2026) -->
        <div class="hp-verify" onclick="App.navigate('consulta-placa')">
          <div class="hp-verify-row">
            <div class="hp-verify-orb">${icon('placa')}</div>
            <div class="hp-verify-info">
              <div class="hp-verify-title">🛡️ Consulta Oficial de Placa</div>
              <div class="hp-verify-sub">Restrições, furto/roubo e bloqueios direto na fonte DETRAN — não é estimativa de IA</div>
            </div>
            <div class="hp-verify-price">R$ 19,90<span>por consulta</span></div>
          </div>
        </div>

        <!-- NEXUS LIVE CHAT"""
    str_replace("js/home-premium.js", old_banner, new_banner, "home-premium.js: banner CTA")

    # 7. home-premium.js — tile no grid de servicos
    old_svc = """    { page: 'vistoria',      icon: 'vistoria',      label: 'Vistoria',      cls: 'hp-oc-indigo' },
    { page: 'chat',          icon: 'chatia',        label: 'Chat IA',       cls: 'hp-oc-pink'   },"""
    new_svc = """    { page: 'vistoria',      icon: 'vistoria',      label: 'Vistoria',      cls: 'hp-oc-indigo' },
    { page: 'consulta-placa',icon: 'placa',         label: 'Placa Oficial', cls: 'hp-oc-cyan'   },
    { page: 'chat',          icon: 'chatia',        label: 'Chat IA',       cls: 'hp-oc-pink'   },"""
    str_replace("js/home-premium.js", old_svc, new_svc, "home-premium.js: tile SERVICES")

    # 8. home-premium.js — tile em categorias pequenas
    old_cats = """            <div class="hp-cat-sm hp-oc-indigo" onclick="App.navigate('vistoria')">
              <div class="hp-cat-sm-orb">${icon('vistoria')}</div>
              <span class="hp-cat-sm-lbl">Vistoria</span>
            </div>
          </div>
        </section>"""
    new_cats = """            <div class="hp-cat-sm hp-oc-indigo" onclick="App.navigate('vistoria')">
              <div class="hp-cat-sm-orb">${icon('vistoria')}</div>
              <span class="hp-cat-sm-lbl">Vistoria</span>
            </div>
            <div class="hp-cat-sm hp-oc-cyan" onclick="App.navigate('consulta-placa')">
              <div class="hp-cat-sm-orb">${icon('placa')}</div>
              <span class="hp-cat-sm-lbl">Placa Oficial</span>
            </div>
          </div>
        </section>"""
    str_replace("js/home-premium.js", old_cats, new_cats, "home-premium.js: tile categorias pequenas")

    # 9. home-premium.css -- estilos do banner
    old_css = """.hp-sos-eta span { display:block; font-size:.56rem; color:rgba(244,63,94,.7); }"""
    new_css = """.hp-sos-eta span { display:block; font-size:.56rem; color:rgba(244,63,94,.7); }

/* ─── CONSULTA OFICIAL DE PLACA — Frente H (08/07/2026) ── */
.hp-verify {
  margin-bottom:28px; border-radius:16px; padding:18px;
  background:linear-gradient(135deg,rgba(0,245,255,.14) 0%,rgba(16,185,129,.05) 100%);
  border:1px solid rgba(0,245,255,.3);
  cursor:pointer; transition:all .22s; position:relative; overflow:hidden;
}
.hp-verify::before {
  content:''; position:absolute; top:-40px; right:-30px; width:140px; height:140px; border-radius:50%;
  background:radial-gradient(circle,rgba(0,245,255,.18) 0%,transparent 70%); pointer-events:none;
}
.hp-verify:hover { border-color:rgba(0,245,255,.5); transform:translateY(-2px); }
.hp-verify-row { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.hp-verify-orb {
  width:54px; height:54px; border-radius:16px; flex-shrink:0;
  background:rgba(0,245,255,.14); border:1.5px solid rgba(0,245,255,.4);
  display:flex; align-items:center; justify-content:center;
}
.hp-verify-info { flex:1; min-width:200px; }
.hp-verify-title { font-family:'Bebas Neue',sans-serif; font-size:1.15rem; letter-spacing:1px; color:#00f5ff; margin-bottom:3px; }
.hp-verify-sub { font-size:.78rem; color:var(--muted); }
.hp-verify-price {
  font-family:'JetBrains Mono',monospace; font-size:.78rem; font-weight:700; color:#10b981;
  background:rgba(16,185,129,.13); border:1px solid rgba(16,185,129,.3);
  border-radius:8px; padding:5px 12px; text-align:center; flex-shrink:0;
}
.hp-verify-price span { display:block; font-size:.56rem; font-weight:500; color:rgba(16,185,129,.75); }"""
    str_replace("css/home-premium.css", old_css, new_css, "home-premium.css: estilos hp-verify")

    # 10. index.html -- css + scripts + version bumps
    old_css_links = """<link rel="stylesheet" href="css/style.css?v=20260620b">
<link rel="stylesheet" href="css/home-premium.css?v=20260620b">
<link rel="stylesheet" href="css/auth-extra.css?v=20260621a">
<link rel="stylesheet" href="css/listing-gallery.css?v=20260703a">"""
    new_css_links = """<link rel="stylesheet" href="css/style.css?v=20260620b">
<link rel="stylesheet" href="css/home-premium.css?v=20260708a">
<link rel="stylesheet" href="css/auth-extra.css?v=20260621a">
<link rel="stylesheet" href="css/listing-gallery.css?v=20260703a">
<link rel="stylesheet" href="css/plate-check.css?v=20260708a">"""
    str_replace("index.html", old_css_links, new_css_links, "index.html: link do plate-check.css")

    old_scripts = """<script src="js/app.js?v=20260702c"></script>
<script src="js/api.js?v=20260624a"></script>
<script src="js/central.js?v=20260703a"></script>
<script src="js/vehicle-verify.js?v=20260704a"></script>
<script src="js/listing-boost.js?v=20260708a"></script>"""
    new_scripts = """<script src="js/app.js?v=20260708a"></script>
<script src="js/api.js?v=20260708a"></script>
<script src="js/central.js?v=20260703a"></script>
<script src="js/vehicle-verify.js?v=20260704a"></script>
<script src="js/plate-check.js?v=20260708a"></script>
<script src="js/listing-boost.js?v=20260708a"></script>"""
    str_replace("index.html", old_scripts, new_scripts, "index.html: script do plate-check.js + bumps")

    old_hp_script = """<script src="js/home-premium.js?v=20260619e"></script>"""
    new_hp_script = """<script src="js/home-premium.js?v=20260708a"></script>"""
    str_replace("index.html", old_hp_script, new_hp_script, "index.html: bump home-premium.js")

    print()
    print("Validando sintaxe dos .js tocados (node --check)...")
    for rel in ["js/api.js", "js/app.js", "js/plate-check.js", "js/home-premium.js"]:
        full = os.path.join(ROOT, rel)
        if not os.path.exists(full):
            continue
        try:
            r = subprocess.run(["node", "--check", full], capture_output=True, text=True)
            if r.returncode == 0:
                ok(f"node --check {rel}")
            else:
                err(f"node --check {rel}: {r.stderr.strip()}")
        except FileNotFoundError:
            skip("node nao encontrado no PATH -- rode `node --check` manualmente nos arquivos tocados.")
            break

    print()
    print("Patch frontend concluido. Proximos passos manuais:")
    print("  1) git add -A && git commit -m \"Frente H: consulta de placa standalone (frontend)\"")
    print("  2) Confirme a branch (deve ser main) e git push")
    print("  3) LEMBRETE: so encerrar a sessao com os dois repos (mobya-app e Mobya) com git status limpo.")

PLATE_JS_B64 = "Ly8ganMvcGxhdGUtY2hlY2suanMKLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ci8vIEZyZW50ZSBIIGRvIG1hc3RlciBwcm9tcHQgKDA4LzA3LzIwMjYpIOKAlCBDb25zdWx0YSBPZmljaWFsIGRlIFBsYWNhLAovLyBhY2Vzc8OtdmVsIGEgcGFydGlyIGRhIEhvbWUgcHJhIHF1YWxxdWVyIHVzdcOhcmlvLCBkb25vIGRlIGFuw7puY2lvIG91IG7Do28uCi8vIFJlYXByb3ZlaXRhIDEwMCUgbyBiYWNrZW5kIHBhZ28gZGEgRnJlbnRlIEEgKHdlYmhvb2ssIFBJWCwgSW5mb3NpbXBsZXMpCi8vIHZpYSBhIHJvdGEgc3RhbmRhbG9uZSBub3ZhICh2ZWhpY2xlLWNoZWNrLXN0YW5kYWxvbmUucm91dGVzLmpzKS4KLy8KLy8gRGVsaWJlcmFkYW1lbnRlIE7Dg08gw6kgbyBtZXNtbyBtw7NkdWxvL3DDoWdpbmEgZG8gdGlsZSAiVmlzdG9yaWEiCi8vIChQYWdlcy5yZW5kZXJWaXN0b3JpYSBlbSBwYWdlcy5qcyksIHF1ZSDDqSB1bWEgYW7DoWxpc2UgaGV1csOtc3RpY2EgZGUgSUEKLy8gc2VtIGNvbnN1bHRhIHJlYWwgYW8gREVUUkFOLiBFc3RhIHDDoWdpbmEgZGVpeGEgaXNzbyBleHBsw61jaXRvIG5hIGPDs3BpYQovLyBwcmEgbsOjbyBjb25mdW5kaXIgbyB1c3XDoXJpbyBzb2JyZSBvIHF1ZSBlc3TDoSBwYWdhbmRvLgovLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0Kd2luZG93LlBsYXRlQ2hlY2sgPSAoKCkgPT4gewogIGxldCBfcG9sbFRpbWVyICAgPSBudWxsOwogIGxldCBfY2hlY2tJZCAgICAgPSBudWxsOwogIGxldCBfYW1vdW50ICAgICAgPSBudWxsOwogIGxldCBfcGxhY2EgICAgICAgPSBudWxsOwoKICBjb25zdCBVRlMgPSAnQUMsQUwsQVAsQU0sQkEsQ0UsREYsRVMsR08sTUEsTVQsTVMsTUcsUEEsUEIsUFIsUEUsUEksUkosUk4sUlMsUk8sUlIsU0MsU1AsU0UsVE8nLnNwbGl0KCcsJyk7CgogIGZ1bmN0aW9uIG1haW4oKSB7IHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbicpOyB9CgogIC8vIOKUgOKUgCBSRU5ERVI6IHRlbGEgaW5pY2lhbCAoZm9ybSkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACiAgZnVuY3Rpb24gcmVuZGVyKCkgewogICAgY29uc3QgZWwgPSBtYWluKCk7CiAgICBpZiAoIWVsKSByZXR1cm47CiAgICBfc3RvcFBvbGxpbmcoKTsKCiAgICBlbC5pbm5lckhUTUwgPSBgCiAgICAgIDxkaXYgY2xhc3M9InBjLXdyYXAiPgogICAgICAgIDxkaXYgY2xhc3M9InBjLWhlcm8iPgogICAgICAgICAgPGRpdiBjbGFzcz0icGMtaGVyby1iYWRnZSI+8J+boe+4jyBDT05TVUxUQSBPRklDSUFMIMK3IEZPTlRFIERFVFJBTjwvZGl2PgogICAgICAgICAgPGgxIGNsYXNzPSJwYy1oZXJvLXRpdGxlIj5EZXNjdWJyYSB0dWRvIHNvYnJlPGJyPjxlbT5xdWFscXVlciBwbGFjYTwvZW0+IGFudGVzIGRlIGZlY2hhciBuZWfDs2Npby48L2gxPgogICAgICAgICAgPHAgY2xhc3M9InBjLWhlcm8tc3ViIj5Db25zdWx0YSBvZmljaWFsIGRlIHJlc3RyacOnw7VlcyB2ZWljdWxhcmVzIChmdXJ0by9yb3VibywgYmxvcXVlaW9zLCBkw6liaXRvcykKICAgICAgICAgICAgZGlyZXRvIG5hIGJhc2UgZG8gREVUUkFOIOKAlCBuw6NvIMOpIGVzdGltYXRpdmEgZGUgSUEsIMOpIG8gZGFkbyByZWFsLCBvIG1lc21vIHF1ZSB1bWEgdmlzdG9yaWEKICAgICAgICAgICAgY2F1dGVsYXIgdXNhcmlhIGNvbW8gcG9udG8gZGUgcGFydGlkYS48L3A+CiAgICAgICAgPC9kaXY+CgogICAgICAgIDxkaXYgY2xhc3M9InBjLWNhcmQiPgogICAgICAgICAgPGRpdiBjbGFzcz0icGMtY2FyZC1oZCI+CiAgICAgICAgICAgIDxkaXYgY2xhc3M9InBjLWNhcmQtaGQtaWNvIj7wn5SOPC9kaXY+CiAgICAgICAgICAgIDxkaXY+CiAgICAgICAgICAgICAgPGRpdiBjbGFzcz0icGMtY2FyZC1oZC10dGwiPkNvbnN1bHRhciBwbGFjYSBhZ29yYTwvZGl2PgogICAgICAgICAgICAgIDxkaXYgY2xhc3M9InBjLWNhcmQtaGQtc3ViIj5SZXN1bHRhZG8gZW0gbWludXRvcyBhcMOzcyBvIHBhZ2FtZW50byB2aWEgUElYPC9kaXY+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgPC9kaXY+CgogICAgICAgICAgPGZvcm0gaWQ9InBjRm9ybSIgb25zdWJtaXQ9InJldHVybiBmYWxzZSI+CiAgICAgICAgICAgIDxkaXYgY2xhc3M9InBjLWZpZWxkIj4KICAgICAgICAgICAgICA8bGFiZWw+UGxhY2E8L2xhYmVsPgogICAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGNQbGFjYSIgbWF4bGVuZ3RoPSI3IiBwbGFjZWhvbGRlcj0iQUJDMUQyMyIgYXV0b2NvbXBsZXRlPSJvZmYiCiAgICAgICAgICAgICAgICBvbmlucHV0PSJ0aGlzLnZhbHVlPXRoaXMudmFsdWUudG9VcHBlckNhc2UoKS5yZXBsYWNlKC9bXkEtWjAtOV0vZywnJykiPgogICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgPGRpdiBjbGFzcz0icGMtZmllbGQiPgogICAgICAgICAgICAgIDxsYWJlbD5Fc3RhZG8gKFVGKTwvbGFiZWw+CiAgICAgICAgICAgICAgPHNlbGVjdCBpZD0icGNVZiI+CiAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPSIiPlNlbGVjaW9uZeKApjwvb3B0aW9uPgogICAgICAgICAgICAgICAgJHtVRlMubWFwKHVmID0+IGA8b3B0aW9uIHZhbHVlPSIke3VmfSI+JHt1Zn08L29wdGlvbj5gKS5qb2luKCcnKX0KICAgICAgICAgICAgICA8L3NlbGVjdD4KICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICA8YnV0dG9uIHR5cGU9ImJ1dHRvbiIgaWQ9InBjVG9nZ2xlQWR2IiBvbmNsaWNrPSJQbGF0ZUNoZWNrLl90b2dnbGVBZHYoKSIgY2xhc3M9InBjLWFkdi10b2dnbGUiPgogICAgICAgICAgICAgICsgUmVuYXZhbSAvIENoYXNzaSAob3BjaW9uYWwsIGFqdWRhIGEgcHJlY2lzw6NvKQogICAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICAgICAgPGRpdiBpZD0icGNBZHZGaWVsZHMiIHN0eWxlPSJkaXNwbGF5Om5vbmUiPgogICAgICAgICAgICAgIDxkaXYgY2xhc3M9InBjLWZpZWxkIj4KICAgICAgICAgICAgICAgIDxsYWJlbD5SZW5hdmFtPC9sYWJlbD4KICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGNSZW5hdmFtIiBtYXhsZW5ndGg9IjExIiBwbGFjZWhvbGRlcj0iT3BjaW9uYWwiIGF1dG9jb21wbGV0ZT0ib2ZmIgogICAgICAgICAgICAgICAgICBvbmlucHV0PSJ0aGlzLnZhbHVlPXRoaXMudmFsdWUucmVwbGFjZSgvXFxEL2csJycpIj4KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSJwYy1maWVsZCI+CiAgICAgICAgICAgICAgICA8bGFiZWw+Q2hhc3NpPC9sYWJlbD4KICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPSJ0ZXh0IiBpZD0icGNDaGFzc2kiIG1heGxlbmd0aD0iMTciIHBsYWNlaG9sZGVyPSJPcGNpb25hbCIgYXV0b2NvbXBsZXRlPSJvZmYiCiAgICAgICAgICAgICAgICAgIG9uaW5wdXQ9InRoaXMudmFsdWU9dGhpcy52YWx1ZS50b1VwcGVyQ2FzZSgpIj4KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICA8ZGl2IGlkPSJwY0Zvcm1FcnJvciIgY2xhc3M9InBjLWZvcm0tZXJyb3IiIHN0eWxlPSJkaXNwbGF5Om5vbmUiPjwvZGl2PgoKICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPSJidXR0b24iIG9uY2xpY2s9IlBsYXRlQ2hlY2suX3N1Ym1pdCgpIiBjbGFzcz0icGMtY3RhIj4KICAgICAgICAgICAgICA8c3Bhbj5Db25zdWx0YXIgYWdvcmE8L3NwYW4+CiAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9InBjLWN0YS1wcmljZSI+UiQgMTksOTA8L3NwYW4+CiAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgICA8ZGl2IGNsYXNzPSJwYy1jdGEtbm90ZSI+UGFnYW1lbnRvIMO6bmljbyB2aWEgUElYIMK3IHNlbSBhc3NpbmF0dXJhIMK3IHJlc3VsdGFkbyBkaXJldG8gbm8gYXBwPC9kaXY+CiAgICAgICAgICA8L2Zvcm0+CiAgICAgICAgPC9kaXY+CgogICAgICAgIDxkaXYgY2xhc3M9InBjLXRydXN0Ij4KICAgICAgICAgIDxkaXYgY2xhc3M9InBjLXRydXN0LWl0ZW0iPjxzcGFuPvCfj5vvuI88L3NwYW4+Q29uc3VsdGEgb2ZpY2lhbCB2aWEgYmFzZSBww7pibGljYSBkZSByZXN0cmnDp8O1ZXM8L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9InBjLXRydXN0LWl0ZW0iPjxzcGFuPuKaoTwvc3Bhbj5SZXN1bHRhZG8gcHJvY2Vzc2FkbyBhdXRvbWF0aWNhbWVudGUgYXDDs3MgcGFnYW1lbnRvPC9kaXY+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJwYy10cnVzdC1pdGVtIj48c3Bhbj7wn5SSPC9zcGFuPlNldXMgZGFkb3MgZGUgY29uc3VsdGEgZmljYW0gc8OzIG5hIHN1YSBjb250YSBNT0JZQTwvZGl2PgogICAgICAgIDwvZGl2PgoKICAgICAgICA8ZGl2IGNsYXNzPSJwYy1kaWZmIj4KICAgICAgICAgIDxkaXYgY2xhc3M9InBjLWRpZmYtdHRsIj5Jc3NvIMOpIGRpZmVyZW50ZSBkYSAiVmlzdG9yaWEiIGRvIGFwcD88L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9InBjLWRpZmYtYm9keSI+U2ltLiBBIDxzdHJvbmc+VmlzdG9yaWE8L3N0cm9uZz4gKG5hIEhvbWUpIMOpIHVtYSBhbsOhbGlzZSBkZSByaXNjbyBwb3IgSUEgYQogICAgICAgICAgICBwYXJ0aXIgZG8gcXVlIHZvY8OqIGRpZ2l0YSDigJQgw7p0aWwgY29tbyB0cmlhZ2VtIGluaWNpYWwsIG1hcyBuw6NvIGNvbnN1bHRhIG5lbmh1bWEgYmFzZSBvZmljaWFsLiBFc3RhCiAgICAgICAgICAgIHDDoWdpbmEgYXF1aSBmYXogYSA8c3Ryb25nPmNvbnN1bHRhIHJlYWwgbmEgZm9udGUgcMO6YmxpY2EgZGUgcmVzdHJpw6fDtWVzIGRvIHZlw61jdWxvPC9zdHJvbmc+LCBvIGRhZG8KICAgICAgICAgICAgcXVlIGRlIGZhdG8gaW1wb3J0YSBhbnRlcyBkZSBmZWNoYXIgdW1hIGNvbXByYS48L2Rpdj4KICAgICAgICA8L2Rpdj4KCiAgICAgICAgPGRpdiBpZD0icGNIaXN0b3J5U2VjdGlvbiI+PC9kaXY+CiAgICAgIDwvZGl2PgogICAgYDsKCiAgICBfbG9hZEhpc3RvcnkoKTsKICB9CgogIGZ1bmN0aW9uIF90b2dnbGVBZHYoKSB7CiAgICBjb25zdCBib3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGNBZHZGaWVsZHMnKTsKICAgIGNvbnN0IGJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwY1RvZ2dsZUFkdicpOwogICAgaWYgKCFib3gpIHJldHVybjsKICAgIGNvbnN0IHNob3cgPSBib3guc3R5bGUuZGlzcGxheSA9PT0gJ25vbmUnOwogICAgYm94LnN0eWxlLmRpc3BsYXkgPSBzaG93ID8gJ2Jsb2NrJyA6ICdub25lJzsKICAgIGJ0bi50ZXh0Q29udGVudCA9IHNob3cgPyAn4oiSIE9jdWx0YXIgUmVuYXZhbSAvIENoYXNzaScgOiAnKyBSZW5hdmFtIC8gQ2hhc3NpIChvcGNpb25hbCwgYWp1ZGEgYSBwcmVjaXPDo28pJzsKICB9CgogIGZ1bmN0aW9uIF9mb3JtRXJyb3IobXNnKSB7CiAgICBjb25zdCBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwY0Zvcm1FcnJvcicpOwogICAgaWYgKCFlbCkgcmV0dXJuOwogICAgaWYgKCFtc2cpIHsgZWwuc3R5bGUuZGlzcGxheSA9ICdub25lJzsgcmV0dXJuOyB9CiAgICBlbC50ZXh0Q29udGVudCA9IG1zZzsKICAgIGVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snOwogIH0KCiAgLy8g4pSA4pSAIFNVQk1JVDogY29icmEgZSBtb3N0cmEgbW9kYWwgZGUgUElYIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAogIGFzeW5jIGZ1bmN0aW9uIF9zdWJtaXQoKSB7CiAgICBjb25zdCBwbGFjYSA9IChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGNQbGFjYScpPy52YWx1ZSB8fCAnJykudHJpbSgpOwogICAgY29uc3QgdWYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGNVZicpPy52YWx1ZSB8fCAnJzsKICAgIGNvbnN0IHJlbmF2YW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGNSZW5hdmFtJyk/LnZhbHVlPy50cmltKCkgfHwgdW5kZWZpbmVkOwogICAgY29uc3QgY2hhc3NpID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BjQ2hhc3NpJyk/LnZhbHVlPy50cmltKCkgfHwgdW5kZWZpbmVkOwoKICAgIGlmICghL15bQS1aXXszfVswLTldW0EtWjAtOV1bMC05XXsyfSQvLnRlc3QocGxhY2EpKSByZXR1cm4gX2Zvcm1FcnJvcignUGxhY2EgaW52w6FsaWRhLiBVc2UgbyBmb3JtYXRvIEFCQzEyMzQgb3UgQUJDMUQyMy4nKTsKICAgIGlmICghdWYpIHJldHVybiBfZm9ybUVycm9yKCdTZWxlY2lvbmUgbyBlc3RhZG8gKFVGKS4nKTsKICAgIF9mb3JtRXJyb3IobnVsbCk7CgogICAgaWYgKCFBUEkuaXNBdXRoKCkpIHsgQXBwLnRvYXN0KCdGYcOnYSBsb2dpbiBwcmEgY29uc3VsdGFyIGEgcGxhY2EuJywgJ3dhcm4nKTsgd2luZG93Lk1vYnlhQXV0aD8uc2hvd0xvZ2luKCk7IHJldHVybjsgfQoKICAgIF9wbGFjYSA9IHBsYWNhOwogICAgX3Nob3dNb2RhbCh7IGxvYWRpbmc6IHRydWUgfSk7CiAgICB0cnkgewogICAgICBjb25zdCByID0gYXdhaXQgQVBJLnZlaGljbGVDaGVjay5zdGFuZGFsb25lQ2hhcmdlKHsgcGxhY2EsIHVmLCByZW5hdmFtLCBjaGFzc2kgfSk7CiAgICAgIGNvbnN0IHsgcGl4LCBhbW91bnQsIHZlaGljbGVDaGVja0lkIH0gPSByLmRhdGEgfHwgcjsKICAgICAgX2NoZWNrSWQgPSB2ZWhpY2xlQ2hlY2tJZDsKICAgICAgX2Ftb3VudCA9IGFtb3VudDsKICAgICAgX3Nob3dNb2RhbCh7IGxvYWRpbmc6IGZhbHNlLCBhbW91bnQsIHFyQ29kZTogcGl4Py5xckNvZGUgfHwgbnVsbCwgcXJDb2RlQmFzZTY0OiBwaXg/LnFyQ29kZUJhc2U2NCB8fCBudWxsIH0pOwogICAgICBfc3RhcnRQb2xsaW5nKCk7CiAgICB9IGNhdGNoIChlKSB7CiAgICAgIF9zaG93TW9kYWwoeyBsb2FkaW5nOiBmYWxzZSwgZXJyb3I6IGUubWVzc2FnZSB8fCAnRXJybyBhbyBnZXJhciBQSVggZGEgY29uc3VsdGEuJyB9KTsKICAgIH0KICB9CgogIGZ1bmN0aW9uIF9zdGFydFBvbGxpbmcoKSB7CiAgICBpZiAoX3BvbGxUaW1lcikgY2xlYXJJbnRlcnZhbChfcG9sbFRpbWVyKTsKICAgIF9wb2xsVGltZXIgPSBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7CiAgICAgIHRyeSB7CiAgICAgICAgY29uc3QgciA9IGF3YWl0IEFQSS52ZWhpY2xlQ2hlY2suc3RhbmRhbG9uZVN0YXR1cyhfY2hlY2tJZCk7CiAgICAgICAgY29uc3QgZGF0YSA9IHIuZGF0YSB8fCByOwogICAgICAgIGlmIChkYXRhLnZlcmlmaWVkKSB7CiAgICAgICAgICBfc3RvcFBvbGxpbmcoKTsKICAgICAgICAgIF9vblZlcmlmaWVkKGRhdGEpOwogICAgICAgIH0gZWxzZSBpZiAoZGF0YS5zdGF0dXMgPT09ICdGQUlMRUQnKSB7CiAgICAgICAgICBfc3RvcFBvbGxpbmcoKTsKICAgICAgICAgIF91cGRhdGVNb2RhbFN0YXR1cygn4pqg77iPIEEgY29uc3VsdGEgZmFsaG91LiBUZW50ZSBub3ZhbWVudGUgZW0gYWxndW5zIG1pbnV0b3Mgb3UgZmFsZSBjb20gbyBzdXBvcnRlLicsICd3YXJuJyk7CiAgICAgICAgfQogICAgICB9IGNhdGNoIHsgLyogc2lsZW5jaW9zbywgdGVudGEgZGUgbm92byBubyBwcsOzeGltbyBjaWNsbyAqLyB9CiAgICB9LCA0MDAwKTsKICB9CgogIGZ1bmN0aW9uIF9zdG9wUG9sbGluZygpIHsKICAgIGlmIChfcG9sbFRpbWVyKSB7IGNsZWFySW50ZXJ2YWwoX3BvbGxUaW1lcik7IF9wb2xsVGltZXIgPSBudWxsOyB9CiAgfQoKICBmdW5jdGlvbiBfb25WZXJpZmllZChkYXRhKSB7CiAgICB3aW5kb3cuQW5hbHl0aWNzPy50cmFjaygncHVyY2hhc2UnLCB7CiAgICAgIHRyYW5zYWN0aW9uX2lkOiBfY2hlY2tJZCwgdmFsdWU6IF9hbW91bnQsIGN1cnJlbmN5OiAnQlJMJywgaXRlbV9uYW1lOiAnY29uc3VsdGFfcGxhY2Ffc3RhbmRhbG9uZScsCiAgICB9KTsKICAgIF9jbG9zZU1vZGFsKCk7CiAgICBfcmVuZGVyUmVzdWx0KGRhdGEpOwogICAgX2xvYWRIaXN0b3J5KCk7CiAgfQoKICAvLyDilIDilIAgUkVTVUxUQURPIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAogIGZ1bmN0aW9uIF9yZW5kZXJSZXN1bHQoZGF0YSkgewogICAgY29uc3QgZWwgPSBtYWluKCk7CiAgICBpZiAoIWVsKSByZXR1cm47CiAgICBjb25zdCByZXN0cmljYW8gPSBkYXRhLmV4aXN0ZVJlc3RyaWNhbyA9PT0gdHJ1ZTsKICAgIGNvbnN0IHN0YXR1c0NvbG9yID0gcmVzdHJpY2FvID8gJyNlZjQ0NDQnIDogJyMxMGI5ODEnOwogICAgY29uc3Qgc3RhdHVzSWNvbiA9IHJlc3RyaWNhbyA/ICfimqDvuI8nIDogJ+KchSc7CiAgICBjb25zdCBzdGF0dXNUZXh0ID0gcmVzdHJpY2FvID8gJ1Jlc3RyacOnw6NvIGVuY29udHJhZGEnIDogJ05lbmh1bWEgcmVzdHJpw6fDo28gZW5jb250cmFkYSc7CgogICAgZWwuaW5uZXJIVE1MID0gYAogICAgICA8ZGl2IGNsYXNzPSJwYy13cmFwIj4KICAgICAgICA8ZGl2IGNsYXNzPSJwYy1yZXN1bHQtY2FyZCIgc3R5bGU9ImJvcmRlci1jb2xvcjoke3N0YXR1c0NvbG9yfTU1Ij4KICAgICAgICAgIDxkaXYgY2xhc3M9InBjLXJlc3VsdC1pY28iIHN0eWxlPSJiYWNrZ3JvdW5kOiR7c3RhdHVzQ29sb3J9MjI7Y29sb3I6JHtzdGF0dXNDb2xvcn0iPiR7c3RhdHVzSWNvbn08L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9InBjLXJlc3VsdC1wbGF0ZSI+JHtkYXRhLnBsYWNhIHx8IF9wbGFjYSB8fCAnJ308L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9InBjLXJlc3VsdC1zdGF0dXMiIHN0eWxlPSJjb2xvcjoke3N0YXR1c0NvbG9yfSI+JHtzdGF0dXNUZXh0fTwvZGl2PgogICAgICAgICAgPGRpdiBjbGFzcz0icGMtcmVzdWx0LXN1YiI+Q29uc3VsdGEgb2ZpY2lhbCBjb25jbHXDrWRhIMK3IGZvbnRlIHDDumJsaWNhIGRlIHJlc3RyacOnw7VlcyB2ZWljdWxhcmVzPC9kaXY+CiAgICAgICAgICA8YnV0dG9uIGNsYXNzPSJwYy1jdGEiIG9uY2xpY2s9IlBsYXRlQ2hlY2sucmVuZGVyKCkiIHN0eWxlPSJtYXJnaW4tdG9wOjIwcHgiPgogICAgICAgICAgICA8c3Bhbj5GYXplciBub3ZhIGNvbnN1bHRhPC9zcGFuPgogICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICA8YnV0dG9uIG9uY2xpY2s9IkFwcC5uYXZpZ2F0ZSgnY2xhc3NpZmljYWRvcycpIiBjbGFzcz0icGMtcmVzdWx0LXNlY29uZGFyeSI+VmVyIGFuw7puY2lvcyBkZSB2ZcOtY3Vsb3Mg4oaSPC9idXR0b24+CiAgICAgICAgPC9kaXY+CiAgICAgICAgPGRpdiBpZD0icGNIaXN0b3J5U2VjdGlvbiI+PC9kaXY+CiAgICAgIDwvZGl2PgogICAgYDsKICAgIF9sb2FkSGlzdG9yeSgpOwogIH0KCiAgLy8g4pSA4pSAIEhJU1TDk1JJQ08g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACiAgYXN5bmMgZnVuY3Rpb24gX2xvYWRIaXN0b3J5KCkgewogICAgY29uc3QgYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BjSGlzdG9yeVNlY3Rpb24nKTsKICAgIGlmICghYm94IHx8ICFBUEkuaXNBdXRoKCkpIHJldHVybjsKICAgIHRyeSB7CiAgICAgIGNvbnN0IHIgPSBhd2FpdCBBUEkudmVoaWNsZUNoZWNrLnN0YW5kYWxvbmVNaW5lKCk7CiAgICAgIGNvbnN0IGNoZWNrcyA9IChyLmRhdGEgfHwgcikuY2hlY2tzIHx8IFtdOwogICAgICBpZiAoIWNoZWNrcy5sZW5ndGgpIHJldHVybjsKICAgICAgYm94LmlubmVySFRNTCA9IGAKICAgICAgICA8ZGl2IGNsYXNzPSJwYy1oaXN0Ij4KICAgICAgICAgIDxkaXYgY2xhc3M9InBjLWhpc3QtdHRsIj5TdWFzIMO6bHRpbWFzIGNvbnN1bHRhczwvZGl2PgogICAgICAgICAgJHtjaGVja3Muc2xpY2UoMCwgNikubWFwKF9oaXN0b3J5Um93KS5qb2luKCcnKX0KICAgICAgICA8L2Rpdj5gOwogICAgfSBjYXRjaCB7IC8qIGhpc3TDs3JpY28gw6kgb3BjaW9uYWwsIGZhbGhhIHNpbGVuY2lvc2EgKi8gfQogIH0KCiAgZnVuY3Rpb24gX2hpc3RvcnlSb3coYykgewogICAgY29uc3QgU1RBVFVTX01BUCA9IHsKICAgICAgUEVORElOR19QQVlNRU5UOiB7IGxhYmVsOiAnQWd1YXJkYW5kbyBwYWdhbWVudG8nLCBjb2xvcjogJyNmNTllMGInIH0sCiAgICAgIFBST0NFU1NJTkc6ICAgICAgeyBsYWJlbDogJ1Byb2Nlc3NhbmRv4oCmJywgICAgICAgICAgY29sb3I6ICcjM2I4MmY2JyB9LAogICAgICBDT01QTEVURUQ6ICAgICAgIHsgbGFiZWw6IGMuZXhpc3RlUmVzdHJpY2FvID8gJ1Jlc3RyacOnw6NvIGVuY29udHJhZGEnIDogJ1NlbSByZXN0cmnDp8OjbycsIGNvbG9yOiBjLmV4aXN0ZVJlc3RyaWNhbyA/ICcjZWY0NDQ0JyA6ICcjMTBiOTgxJyB9LAogICAgICBGQUlMRUQ6ICAgICAgICAgIHsgbGFiZWw6ICdGYWxob3UnLCAgICAgICAgICAgICAgICAgY29sb3I6ICcjZWY0NDQ0JyB9LAogICAgfTsKICAgIGNvbnN0IHMgPSBTVEFUVVNfTUFQW2Muc3RhdHVzXSB8fCB7IGxhYmVsOiBjLnN0YXR1cywgY29sb3I6ICd2YXIoLS1tdXRlZCknIH07CiAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoYy5jcmVhdGVkQXQpLnRvTG9jYWxlRGF0ZVN0cmluZygncHQtQlInKTsKICAgIHJldHVybiBgCiAgICAgIDxkaXYgY2xhc3M9InBjLWhpc3Qtcm93Ij4KICAgICAgICA8ZGl2IGNsYXNzPSJwYy1oaXN0LXBsYXRlIj4ke2MucGxhY2F9PHNwYW4gY2xhc3M9InBjLWhpc3QtdWYiPiR7Yy51Zn08L3NwYW4+PC9kaXY+CiAgICAgICAgPGRpdiBjbGFzcz0icGMtaGlzdC1zdGF0dXMiIHN0eWxlPSJjb2xvcjoke3MuY29sb3J9Ij4ke3MubGFiZWx9PC9kaXY+CiAgICAgICAgPGRpdiBjbGFzcz0icGMtaGlzdC1kYXRlIj4ke2RhdGV9PC9kaXY+CiAgICAgIDwvZGl2PmA7CiAgfQoKICAvLyDilIDilIAgTU9EQUwgREUgUElYIChtZXNtbyBwYWRyw6NvIHZpc3VhbCBkbyBWZWhpY2xlVmVyaWZ5KSDilIDilIDilIDilIDilIAKICBmdW5jdGlvbiBfdXBkYXRlTW9kYWxTdGF0dXMobXNnLCB0eXBlKSB7CiAgICBjb25zdCBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwYy1vdmVybGF5ICNwYy1zdGF0dXMtbXNnJyk7CiAgICBpZiAoIWVsKSByZXR1cm47CiAgICBjb25zdCBjb2xvciA9IHR5cGUgPT09ICd3YXJuJyA/ICcjZjU5ZTBiJyA6ICcjZWY0NDQ0JzsKICAgIGVsLmlubmVySFRNTCA9IGA8ZGl2IHN0eWxlPSJjb2xvcjoke2NvbG9yfTtmb250LXNpemU6LjgycmVtO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NnB4IDAiPiR7bXNnfTwvZGl2PmA7CiAgfQoKICBmdW5jdGlvbiBfY2xvc2VNb2RhbCgpIHsKICAgIF9zdG9wUG9sbGluZygpOwogICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BjLW92ZXJsYXknKT8ucmVtb3ZlKCk7CiAgfQoKICBmdW5jdGlvbiBfc2hvd01vZGFsKHsgbG9hZGluZywgYW1vdW50LCBxckNvZGUsIHFyQ29kZUJhc2U2NCwgZXJyb3IgfSkgewogICAgX2Nsb3NlTW9kYWwoKTsKICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTsKICAgIG92ZXJsYXkuaWQgPSAncGMtb3ZlcmxheSc7CiAgICBvdmVybGF5LnN0eWxlLmNzc1RleHQgPSBgcG9zaXRpb246Zml4ZWQ7aW5zZXQ6MDt6LWluZGV4OjEwMDAwO2JhY2tncm91bmQ6cmdiYSgwLDAsMCwuODIpOwogICAgICBkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXJgOwoKICAgIGxldCBpbm5lcjsKICAgIGlmIChsb2FkaW5nKSB7CiAgICAgIGlubmVyID0gYDxkaXYgc3R5bGU9InRleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6MjRweCAwIj4KICAgICAgICA8ZGl2IHN0eWxlPSJmb250LXNpemU6MnJlbTttYXJnaW4tYm90dG9tOjEycHgiPvCfm6HvuI88L2Rpdj4KICAgICAgICA8ZGl2IHN0eWxlPSJjb2xvcjp2YXIoLS1tdXRlZCk7Zm9udC1zaXplOi45cmVtIj5HZXJhbmRvIFBJWCBkYSBjb25zdWx0YS4uLjwvZGl2PgogICAgICAgIDxkaXYgc3R5bGU9Im1hcmdpbi10b3A6MTZweDt3aWR0aDo0MHB4O2hlaWdodDo0MHB4O2JvcmRlcjozcHggc29saWQgcmdiYSgwLDI0NSwyNTUsLjIpOwogICAgICAgICAgYm9yZGVyLXRvcC1jb2xvcjojMDBmNWZmO2JvcmRlci1yYWRpdXM6NTAlO2FuaW1hdGlvbjpwYy1zcGluIDFzIGxpbmVhciBpbmZpbml0ZTttYXJnaW46MTZweCBhdXRvIj48L2Rpdj4KICAgICAgICA8c3R5bGU+QGtleWZyYW1lcyBwYy1zcGlue3Rve3RyYW5zZm9ybTpyb3RhdGUoMzYwZGVnKX19PC9zdHlsZT4KICAgICAgPC9kaXY+YDsKICAgIH0gZWxzZSBpZiAoZXJyb3IpIHsKICAgICAgaW5uZXIgPSBgPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMHB4IDAiPgogICAgICAgIDxkaXYgc3R5bGU9ImZvbnQtc2l6ZToycmVtO21hcmdpbi1ib3R0b206MTBweCI+4p2MPC9kaXY+CiAgICAgICAgPGRpdiBzdHlsZT0iY29sb3I6I2VmNDQ0NDtmb250LXNpemU6LjlyZW07bWFyZ2luLWJvdHRvbToxNnB4Ij4ke2Vycm9yfTwvZGl2PgogICAgICAgIDxidXR0b24gb25jbGljaz0iUGxhdGVDaGVjay5fY2xvc2VNb2RhbFB1YmxpYygpIiBzdHlsZT0icGFkZGluZzoxMHB4IDI0cHg7Ym9yZGVyLXJhZGl1czo4cHg7CiAgICAgICAgICBiYWNrZ3JvdW5kOnZhcigtLXMyKTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7Y29sb3I6dmFyKC0tdGV4dCk7Y3Vyc29yOnBvaW50ZXIiPkZlY2hhcjwvYnV0dG9uPgogICAgICA8L2Rpdj5gOwogICAgfSBlbHNlIHsKICAgICAgY29uc3QgcHJpY2VGb3JtYXR0ZWQgPSAoYW1vdW50IHx8IDApLnRvTG9jYWxlU3RyaW5nKCdwdC1CUicsIHsgc3R5bGU6ICdjdXJyZW5jeScsIGN1cnJlbmN5OiAnQlJMJyB9KTsKICAgICAgY29uc3QgcXJTZWN0aW9uID0gcXJDb2RlQmFzZTY0CiAgICAgICAgPyBgPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7bWFyZ2luOjE0cHggMCI+CiAgICAgICAgICAgIDxpbWcgc3JjPSJkYXRhOmltYWdlL3BuZztiYXNlNjQsJHtxckNvZGVCYXNlNjR9IiBhbHQ9IlFSIENvZGUgUElYIgogICAgICAgICAgICAgIHN0eWxlPSJ3aWR0aDoxODBweDtoZWlnaHQ6MTgwcHg7Ym9yZGVyLXJhZGl1czoxMHB4O2JvcmRlcjoycHggc29saWQgcmdiYSgwLDI0NSwyNTUsLjMpIj48L2Rpdj5gCiAgICAgICAgOiBgPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoyMHB4O2JhY2tncm91bmQ6cmdiYSgyNTUsMjU1LDI1NSwuMDQpO2JvcmRlci1yYWRpdXM6MTBweDsKICAgICAgICAgICAgbWFyZ2luOjE0cHggMDtjb2xvcjp2YXIoLS1tdXRlZCk7Zm9udC1zaXplOi44MnJlbSI+UVIgY29kZSBuw6NvIGRpc3BvbsOtdmVsIOKAlCB1c2UgbyBjw7NkaWdvIGFiYWl4bzwvZGl2PmA7CiAgICAgIGNvbnN0IGNvcHlTZWN0aW9uID0gcXJDb2RlCiAgICAgICAgPyBgPGJ1dHRvbiBvbmNsaWNrPSJuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCgnJHtxckNvZGV9JykudGhlbigoKT0+e3RoaXMudGV4dENvbnRlbnQ9J+KchSBDb3BpYWRvISc7CiAgICAgICAgICAgIHNldFRpbWVvdXQoKCk9Pnt0aGlzLnRleHRDb250ZW50PSfwn5OLIENvcGlhciBjw7NkaWdvIFBJWCc7fSwyMDAwKTt9KSIgc3R5bGU9IndpZHRoOjEwMCU7cGFkZGluZzoxMnB4OwogICAgICAgICAgICBib3JkZXItcmFkaXVzOjEwcHg7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoMTM1ZGVnLHJnYmEoMCwyNDUsMjU1LC4xNSkscmdiYSgxNiwxODUsMTI5LC4xNSkpOwogICAgICAgICAgICBib3JkZXI6MXB4IHNvbGlkIHJnYmEoMCwyNDUsMjU1LC4zKTtjb2xvcjojMDBmNWZmO2ZvbnQtd2VpZ2h0OjcwMDtmb250LXNpemU6LjlyZW07Y3Vyc29yOnBvaW50ZXI7CiAgICAgICAgICAgIGZvbnQtZmFtaWx5OidTcGFjZSBHcm90ZXNrJyxzYW5zLXNlcmlmIj7wn5OLIENvcGlhciBjw7NkaWdvIFBJWDwvYnV0dG9uPmAKICAgICAgICA6ICcnOwoKICAgICAgaW5uZXIgPSBgCiAgICAgICAgPGRpdiBzdHlsZT0iZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTBweDttYXJnaW4tYm90dG9tOjE2cHgiPgogICAgICAgICAgPGRpdiBzdHlsZT0iZm9udC1zaXplOjEuNnJlbSI+8J+boe+4jzwvZGl2PgogICAgICAgICAgPGRpdj4KICAgICAgICAgICAgPGRpdiBzdHlsZT0iZm9udC1mYW1pbHk6J0JlYmFzIE5ldWUnLHNhbnMtc2VyaWY7Zm9udC1zaXplOjEuNHJlbTtsZXR0ZXItc3BhY2luZzoycHg7Y29sb3I6dmFyKC0tZ29sZCkiPkNPTlNVTFRBIERFIFBMQUNBPC9kaXY+CiAgICAgICAgICAgIDxkaXYgc3R5bGU9ImZvbnQtc2l6ZTouNzVyZW07Y29sb3I6dmFyKC0tbXV0ZWQpIj4ke19wbGFjYSB8fCAnJ30gwrcgY29uc3VsdGEgb2ZpY2lhbCBERVRSQU48L2Rpdj4KICAgICAgICAgIDwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICAgIDxkaXYgc3R5bGU9ImJhY2tncm91bmQ6cmdiYSgxNiwxODUsMTI5LC4wNyk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDE2LDE4NSwxMjksLjIpO2JvcmRlci1yYWRpdXM6MTJweDsKICAgICAgICAgIHBhZGRpbmc6MTRweCAxNnB4O21hcmdpbi1ib3R0b206MTRweDt0ZXh0LWFsaWduOmNlbnRlciI+CiAgICAgICAgICA8ZGl2IHN0eWxlPSJmb250LWZhbWlseTonSmV0QnJhaW5zIE1vbm8nLG1vbm9zcGFjZTtmb250LXNpemU6LjZyZW07bGV0dGVyLXNwYWNpbmc6MnB4O2NvbG9yOnZhcigtLW11dGVkKSI+VkFMT1I8L2Rpdj4KICAgICAgICAgIDxkaXYgc3R5bGU9ImZvbnQtZmFtaWx5OidCZWJhcyBOZXVlJyxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToycmVtO2NvbG9yOiMxMGI5ODEiPiR7cHJpY2VGb3JtYXR0ZWR9PC9kaXY+CiAgICAgICAgPC9kaXY+CiAgICAgICAgJHtxclNlY3Rpb259CiAgICAgICAgJHtjb3B5U2VjdGlvbn0KICAgICAgICA8ZGl2IGlkPSJwYy1zdGF0dXMtbXNnIiBzdHlsZT0ibWFyZ2luLXRvcDoxNHB4Ij48L2Rpdj4KICAgICAgICA8YnV0dG9uIG9uY2xpY2s9IlBsYXRlQ2hlY2suX2Nsb3NlTW9kYWxQdWJsaWMoKSIgc3R5bGU9IndpZHRoOjEwMCU7bWFyZ2luLXRvcDoxMHB4O3BhZGRpbmc6MTBweDtib3JkZXItcmFkaXVzOjhweDsKICAgICAgICAgIGJhY2tncm91bmQ6bm9uZTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7Y29sb3I6dmFyKC0tbXV0ZWQpO2N1cnNvcjpwb2ludGVyO2ZvbnQtc2l6ZTouOHJlbSI+CiAgICAgICAgICBGZWNoYXIgKGEgY29uc3VsdGEgY29udGludWEgc2VuZG8gcHJvY2Vzc2FkYSBhcMOzcyBvIHBhZ2FtZW50bykKICAgICAgICA8L2J1dHRvbj5gOwogICAgfQoKICAgIG92ZXJsYXkuaW5uZXJIVE1MID0gYDxkaXYgc3R5bGU9ImJhY2tncm91bmQ6dmFyKC0tczEsIzBhMGExMik7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIyKTsKICAgICAgYm9yZGVyLXJhZGl1czoxNnB4O3BhZGRpbmc6MjRweDttYXgtd2lkdGg6MzYwcHg7d2lkdGg6OTIlO21heC1oZWlnaHQ6ODh2aDtvdmVyZmxvdy15OmF1dG8iPiR7aW5uZXJ9PC9kaXY+YDsKICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQob3ZlcmxheSk7CiAgfQoKICByZXR1cm4geyByZW5kZXIsIF9zdWJtaXQsIF90b2dnbGVBZHYsIF9jbG9zZU1vZGFsUHVibGljOiBfY2xvc2VNb2RhbCB9Owp9KSgpOwo="
PLATE_CSS_B64 = "Lyog4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQCiAgIE1PQllBIOKAlCBQTEFURSBDSEVDSyAoRnJlbnRlIEgsIDA4LzA3LzIwMjYpCiAgIFDDoWdpbmEgc3RhbmRhbG9uZSBkZSBjb25zdWx0YSBvZmljaWFsIGRlIHBsYWNhLCBhY2Vzc8OtdmVsIGEgcGFydGlyCiAgIGRhIEhvbWUuIEVzdGVuZGUgYXMgdmFyacOhdmVpcyBkZSBjc3Mvc3R5bGUuY3NzLiBUdWRvIHByZWZpeGFkbyBjb20gLnBjLQrilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZAgKi8KCi5wYy13cmFwIHsgbWF4LXdpZHRoOjY0MHB4OyBtYXJnaW46MCBhdXRvOyB9CgovKiDilIDilIDilIAgSEVSTyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KLnBjLWhlcm8geyBtYXJnaW4tYm90dG9tOjIycHg7IH0KLnBjLWhlcm8tYmFkZ2UgewogIGRpc3BsYXk6aW5saW5lLWZsZXg7IGFsaWduLWl0ZW1zOmNlbnRlcjsgZ2FwOjZweDsKICBmb250LWZhbWlseTonSmV0QnJhaW5zIE1vbm8nLG1vbm9zcGFjZTsgZm9udC1zaXplOi42MnJlbTsgbGV0dGVyLXNwYWNpbmc6MS41cHg7CiAgY29sb3I6IzAwZjVmZjsgYmFja2dyb3VuZDpyZ2JhKDAsMjQ1LDI1NSwuMSk7IGJvcmRlcjoxcHggc29saWQgcmdiYSgwLDI0NSwyNTUsLjMpOwogIGJvcmRlci1yYWRpdXM6MjBweDsgcGFkZGluZzo2cHggMTJweDsgbWFyZ2luLWJvdHRvbToxNHB4Owp9Ci5wYy1oZXJvLXRpdGxlIHsKICBmb250LWZhbWlseTonQmViYXMgTmV1ZScsc2Fucy1zZXJpZjsgZm9udC1zaXplOjIuMXJlbTsgbGV0dGVyLXNwYWNpbmc6MnB4OwogIGxpbmUtaGVpZ2h0OjEuMTI7IG1hcmdpbi1ib3R0b206MTBweDsKfQoucGMtaGVyby10aXRsZSBlbSB7CiAgZm9udC1zdHlsZTpub3JtYWw7CiAgYmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQoOTBkZWcsIzAwZjVmZiwjMTBiOTgxKTsKICAtd2Via2l0LWJhY2tncm91bmQtY2xpcDp0ZXh0OyAtd2Via2l0LXRleHQtZmlsbC1jb2xvcjp0cmFuc3BhcmVudDsKfQoucGMtaGVyby1zdWIgeyBjb2xvcjp2YXIoLS1tdXRlZCk7IGZvbnQtc2l6ZTouODZyZW07IGxpbmUtaGVpZ2h0OjEuNjsgfQoKLyog4pSA4pSA4pSAIENBUkQgUFJJTkNJUEFMIC8gRk9STSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KLnBjLWNhcmQgewogIGJhY2tncm91bmQ6dmFyKC0tczIpOyBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcjIpOyBib3JkZXItcmFkaXVzOjE4cHg7CiAgcGFkZGluZzoyMnB4OyBtYXJnaW4tYm90dG9tOjIycHg7Cn0KLnBjLWNhcmQtaGQgeyBkaXNwbGF5OmZsZXg7IGFsaWduLWl0ZW1zOmNlbnRlcjsgZ2FwOjEycHg7IG1hcmdpbi1ib3R0b206MThweDsgfQoucGMtY2FyZC1oZC1pY28gewogIHdpZHRoOjQ0cHg7IGhlaWdodDo0NHB4OyBib3JkZXItcmFkaXVzOjEycHg7IGZsZXgtc2hyaW5rOjA7CiAgYmFja2dyb3VuZDpyZ2JhKDAsMjQ1LDI1NSwuMSk7IGJvcmRlcjoxcHggc29saWQgcmdiYSgwLDI0NSwyNTUsLjMpOwogIGRpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyBmb250LXNpemU6MS4ycmVtOwp9Ci5wYy1jYXJkLWhkLXR0bCB7IGZvbnQtZmFtaWx5OidCZWJhcyBOZXVlJyxzYW5zLXNlcmlmOyBmb250LXNpemU6MS4xNXJlbTsgbGV0dGVyLXNwYWNpbmc6MXB4OyBjb2xvcjp2YXIoLS10ZXh0KTsgfQoucGMtY2FyZC1oZC1zdWIgeyBmb250LXNpemU6Ljc0cmVtOyBjb2xvcjp2YXIoLS1tdXRlZCk7IG1hcmdpbi10b3A6MXB4OyB9CgoucGMtZmllbGQgeyBtYXJnaW4tYm90dG9tOjE0cHg7IH0KLnBjLWZpZWxkIGxhYmVsIHsKICBkaXNwbGF5OmJsb2NrOyBmb250LXNpemU6LjcycmVtOyBmb250LXdlaWdodDo2MDA7IGNvbG9yOnZhcigtLW11dGVkKTsKICBtYXJnaW4tYm90dG9tOjZweDsgdGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlOyBsZXR0ZXItc3BhY2luZzouNXB4Owp9Ci5wYy1maWVsZCBpbnB1dCwgLnBjLWZpZWxkIHNlbGVjdCB7CiAgd2lkdGg6MTAwJTsgaGVpZ2h0OjQ2cHg7IHBhZGRpbmc6MCAxNHB4OyBib3JkZXItcmFkaXVzOjEwcHg7CiAgYmFja2dyb3VuZDp2YXIoLS1zMyk7IGJvcmRlcjoxcHggc29saWQgdmFyKC0tYm9yZGVyKTsgY29sb3I6dmFyKC0tdGV4dCk7CiAgZm9udC1mYW1pbHk6J1NwYWNlIEdyb3Rlc2snLHNhbnMtc2VyaWY7IGZvbnQtc2l6ZTouOTJyZW07IG91dGxpbmU6bm9uZTsKICB0cmFuc2l0aW9uOmJvcmRlci1jb2xvciAuMTVzOwp9Ci5wYy1maWVsZCBpbnB1dDo6cGxhY2Vob2xkZXIgeyBjb2xvcjp2YXIoLS1tdXRlZCk7IH0KLnBjLWZpZWxkIGlucHV0OmZvY3VzLCAucGMtZmllbGQgc2VsZWN0OmZvY3VzIHsgYm9yZGVyLWNvbG9yOiMwMGY1ZmY7IH0KCi5wYy1hZHYtdG9nZ2xlIHsKICBiYWNrZ3JvdW5kOm5vbmU7IGJvcmRlcjpub25lOyBjb2xvcjojMDBmNWZmOyBmb250LXNpemU6Ljc4cmVtOyBmb250LXdlaWdodDo2MDA7CiAgY3Vyc29yOnBvaW50ZXI7IHBhZGRpbmc6MnB4IDAgMTRweCAwOyBmb250LWZhbWlseTonU3BhY2UgR3JvdGVzaycsc2Fucy1zZXJpZjsKfQoKLnBjLWZvcm0tZXJyb3IgewogIGZvbnQtc2l6ZTouNzhyZW07IGNvbG9yOiNlZjQ0NDQ7IGJhY2tncm91bmQ6cmdiYSgyMzksNjgsNjgsLjA4KTsKICBib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjM5LDY4LDY4LC4yNSk7IGJvcmRlci1yYWRpdXM6OHB4OyBwYWRkaW5nOjlweCAxMnB4OyBtYXJnaW4tYm90dG9tOjEycHg7Cn0KCi5wYy1jdGEgewogIHdpZHRoOjEwMCU7IGhlaWdodDo1MnB4OyBib3JkZXI6bm9uZTsgYm9yZGVyLXJhZGl1czoxMnB4OyBjdXJzb3I6cG9pbnRlcjsKICBiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIzA4OTFiMiwjMDU5NjY5KTsKICBkaXNwbGF5OmZsZXg7IGFsaWduLWl0ZW1zOmNlbnRlcjsganVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47IHBhZGRpbmc6MCAyMHB4OwogIGZvbnQtZmFtaWx5OidTcGFjZSBHcm90ZXNrJyxzYW5zLXNlcmlmOyBmb250LXdlaWdodDo3MDA7IGNvbG9yOiNmZmY7IGZvbnQtc2l6ZTouOTJyZW07CiAgdHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE1cywgYm94LXNoYWRvdyAuMTVzOwp9Ci5wYy1jdGE6aG92ZXIgeyB0cmFuc2Zvcm06dHJhbnNsYXRlWSgtMXB4KTsgYm94LXNoYWRvdzowIDZweCAyMnB4IHJnYmEoMCwyNDUsMjU1LC4yMik7IH0KLnBjLWN0YS1wcmljZSB7IGZvbnQtZmFtaWx5OidKZXRCcmFpbnMgTW9ubycsbW9ub3NwYWNlOyBmb250LXNpemU6LjlyZW07IH0KLnBjLWN0YS1ub3RlIHsgdGV4dC1hbGlnbjpjZW50ZXI7IGZvbnQtc2l6ZTouNjhyZW07IGNvbG9yOnZhcigtLW11dGVkKTsgbWFyZ2luLXRvcDoxMHB4OyB9CgovKiDilIDilIDilIAgVFJVU1QgUk9XIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgCAqLwoucGMtdHJ1c3QgeyBkaXNwbGF5OmZsZXg7IGZsZXgtZGlyZWN0aW9uOmNvbHVtbjsgZ2FwOjhweDsgbWFyZ2luLWJvdHRvbToyMnB4OyB9Ci5wYy10cnVzdC1pdGVtIHsKICBkaXNwbGF5OmZsZXg7IGFsaWduLWl0ZW1zOmNlbnRlcjsgZ2FwOjlweDsgZm9udC1zaXplOi44cmVtOyBjb2xvcjp2YXIoLS1tdXRlZCk7Cn0KLnBjLXRydXN0LWl0ZW0gc3BhbiB7IGZvbnQtc2l6ZToxcmVtOyBmbGV4LXNocmluazowOyB9CgovKiDilIDilIDilIAgRElGRVJFTsOHQSBWUyBWSVNUT1JJQSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KLnBjLWRpZmYgewogIGJhY2tncm91bmQ6cmdiYSgyNTUsMjU1LDI1NSwuMDMpOyBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7CiAgYm9yZGVyLXJhZGl1czoxNHB4OyBwYWRkaW5nOjE2cHggMThweDsgbWFyZ2luLWJvdHRvbToyMnB4Owp9Ci5wYy1kaWZmLXR0bCB7IGZvbnQtZmFtaWx5OidCZWJhcyBOZXVlJyxzYW5zLXNlcmlmOyBmb250LXNpemU6Ljk4cmVtOyBsZXR0ZXItc3BhY2luZzouNXB4OyBjb2xvcjp2YXIoLS1xNCk7IG1hcmdpbi1ib3R0b206NnB4OyB9Ci5wYy1kaWZmLWJvZHkgeyBmb250LXNpemU6LjhyZW07IGxpbmUtaGVpZ2h0OjEuNjsgY29sb3I6dmFyKC0tbXV0ZWQpOyB9Ci5wYy1kaWZmLWJvZHkgc3Ryb25nIHsgY29sb3I6dmFyKC0tdGV4dCk7IH0KCi8qIOKUgOKUgOKUgCBSRVNVTFRBRE8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAICovCi5wYy1yZXN1bHQtY2FyZCB7CiAgYmFja2dyb3VuZDp2YXIoLS1zMik7IGJvcmRlcjoxLjVweCBzb2xpZCB2YXIoLS1ib3JkZXIyKTsgYm9yZGVyLXJhZGl1czoyMHB4OwogIHBhZGRpbmc6MzZweCAyNHB4OyB0ZXh0LWFsaWduOmNlbnRlcjsgbWFyZ2luLWJvdHRvbToyMnB4Owp9Ci5wYy1yZXN1bHQtaWNvIHsKICB3aWR0aDo2NHB4OyBoZWlnaHQ6NjRweDsgYm9yZGVyLXJhZGl1czo1MCU7IG1hcmdpbjowIGF1dG8gMTZweDsKICBkaXNwbGF5OmZsZXg7IGFsaWduLWl0ZW1zOmNlbnRlcjsganVzdGlmeS1jb250ZW50OmNlbnRlcjsgZm9udC1zaXplOjEuOHJlbTsKfQoucGMtcmVzdWx0LXBsYXRlIHsKICBmb250LWZhbWlseTonSmV0QnJhaW5zIE1vbm8nLG1vbm9zcGFjZTsgZm9udC1zaXplOjEuNnJlbTsgZm9udC13ZWlnaHQ6NzAwOwogIGxldHRlci1zcGFjaW5nOjNweDsgY29sb3I6dmFyKC0tdGV4dCk7IG1hcmdpbi1ib3R0b206OHB4Owp9Ci5wYy1yZXN1bHQtc3RhdHVzIHsgZm9udC1mYW1pbHk6J0JlYmFzIE5ldWUnLHNhbnMtc2VyaWY7IGZvbnQtc2l6ZToxLjNyZW07IGxldHRlci1zcGFjaW5nOjFweDsgbWFyZ2luLWJvdHRvbTo2cHg7IH0KLnBjLXJlc3VsdC1zdWIgeyBmb250LXNpemU6Ljc4cmVtOyBjb2xvcjp2YXIoLS1tdXRlZCk7IH0KLnBjLXJlc3VsdC1zZWNvbmRhcnkgewogIGRpc3BsYXk6YmxvY2s7IHdpZHRoOjEwMCU7IG1hcmdpbi10b3A6MTBweDsgcGFkZGluZzoxMHB4OyBib3JkZXItcmFkaXVzOjhweDsKICBiYWNrZ3JvdW5kOm5vbmU7IGJvcmRlcjoxcHggc29saWQgdmFyKC0tYm9yZGVyKTsgY29sb3I6dmFyKC0tbXV0ZWQpOyBjdXJzb3I6cG9pbnRlcjsKICBmb250LXNpemU6LjhyZW07IGZvbnQtZmFtaWx5OidTcGFjZSBHcm90ZXNrJyxzYW5zLXNlcmlmOwp9CgovKiDilIDilIDilIAgSElTVMOTUklDTyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAgKi8KLnBjLWhpc3QgeyBiYWNrZ3JvdW5kOnZhcigtLXMyKTsgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1ib3JkZXIpOyBib3JkZXItcmFkaXVzOjE0cHg7IHBhZGRpbmc6MTZweCAxOHB4OyB9Ci5wYy1oaXN0LXR0bCB7IGZvbnQtZmFtaWx5OidKZXRCcmFpbnMgTW9ubycsbW9ub3NwYWNlOyBmb250LXNpemU6LjY2cmVtOyBsZXR0ZXItc3BhY2luZzoycHg7IGNvbG9yOnZhcigtLXE0KTsgbWFyZ2luLWJvdHRvbToxMnB4OyB9Ci5wYy1oaXN0LXJvdyB7CiAgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGdhcDoxMHB4OyBwYWRkaW5nOjlweCAwOwogIGJvcmRlci10b3A6MXB4IHNvbGlkIHZhcigtLWJvcmRlcik7IGZvbnQtc2l6ZTouOHJlbTsKfQoucGMtaGlzdC1yb3c6Zmlyc3Qtb2YtdHlwZSB7IGJvcmRlci10b3A6bm9uZTsgfQoucGMtaGlzdC1wbGF0ZSB7IGZvbnQtZmFtaWx5OidKZXRCcmFpbnMgTW9ubycsbW9ub3NwYWNlOyBmb250LXdlaWdodDo3MDA7IGNvbG9yOnZhcigtLXRleHQpOyB9Ci5wYy1oaXN0LXVmIHsgY29sb3I6dmFyKC0tbXV0ZWQpOyBmb250LXdlaWdodDo1MDA7IG1hcmdpbi1sZWZ0OjVweDsgZm9udC1zaXplOi43cmVtOyB9Ci5wYy1oaXN0LXN0YXR1cyB7IGZsZXg6MTsgdGV4dC1hbGlnbjpyaWdodDsgZm9udC13ZWlnaHQ6NjAwOyB9Ci5wYy1oaXN0LWRhdGUgeyBjb2xvcjp2YXIoLS1tdXRlZCk7IGZvbnQtc2l6ZTouN3JlbTsgd2lkdGg6NjRweDsgdGV4dC1hbGlnbjpyaWdodDsgfQoKQG1lZGlhIChtYXgtd2lkdGg6NDgwcHgpIHsKICAucGMtaGVyby10aXRsZSB7IGZvbnQtc2l6ZToxLjdyZW07IH0KICAucGMtcmVzdWx0LXBsYXRlIHsgZm9udC1zaXplOjEuM3JlbTsgbGV0dGVyLXNwYWNpbmc6MnB4OyB9Cn0K"

if __name__ == "__main__":
    main()
