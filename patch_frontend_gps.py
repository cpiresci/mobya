#!/usr/bin/env python3
"""
Patch frontend — substitui js/gps-tracking.js (rota real OSRM + check-in geofenced)
USO:
  cd ~/mobya-master   # ajuste o path real do seu clone frontend
  python3 patch_frontend_gps.py
Depois:
  git add -A && git commit -m "feat: rota real no mapa + check-in geofenced antes de CHEGOU" && git push
"""
import os, shutil

ROOT = os.getcwd()
TARGET = os.path.join(ROOT, "js/gps-tracking.js")
NEW_CONTENT = open(os.path.join(os.path.dirname(__file__), "gps-tracking.js"), "r", encoding="utf-8").read() if os.path.exists(os.path.join(os.path.dirname(__file__), "gps-tracking.js")) else None

if not NEW_CONTENT:
    print("[ERRO] gps-tracking.js não encontrado ao lado deste script. Rode-o do mesmo diretório onde o baixou.")
    raise SystemExit(1)

if os.path.exists(TARGET):
    shutil.copy(TARGET, TARGET + ".bak")
    print(f"[OK] backup criado: js/gps-tracking.js.bak")

os.makedirs(os.path.dirname(TARGET), exist_ok=True)
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(NEW_CONTENT)

print("[OK] js/gps-tracking.js atualizado.")
print("Próximo passo: git add -A && git commit -m 'feat: rota real + check-in geofenced' && git push")
