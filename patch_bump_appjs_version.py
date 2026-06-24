#!/usr/bin/env python3
"""
Patch: bump da versão de cache-busting de js/app.js.
O fix do toggleBnMenu foi commitado mas a tag <script> continuou com
?v=20260621a — o mesmo valor de antes do patch. Navegadores/CDN podem
servir a versão antiga em cache, mascarando o fix.

Uso (Termux), a partir da raiz do repo mobya-master:
  cp ~/storage/downloads/patch_bump_appjs_version.py .
  python3 patch_bump_appjs_version.py
"""
import sys
from datetime import datetime, timezone

PATH = "index.html"
OLD_TAG = '<script src="js/app.js?v=20260621a"></script>'
NEW_VERSION = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
NEW_TAG = f'<script src="js/app.js?v={NEW_VERSION}"></script>'

def abort(msg):
    print(f"❌ ABORT: {msg}")
    sys.exit(1)

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

count = content.count(OLD_TAG)
if count == 0:
    abort(f"Tag '{OLD_TAG}' não encontrada em {PATH} — talvez já tenha sido bumpada. Confira manualmente com: grep app.js index.html")
if count > 1:
    abort(f"Tag encontrada {count}x — ambíguo, abortando.")

content = content.replace(OLD_TAG, NEW_TAG)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ js/app.js bumpado para ?v={NEW_VERSION}")
print("\n🎉 Patch aplicado com sucesso em", PATH)
