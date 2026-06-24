#!/usr/bin/env python3
"""
Patch: bump de cache de js/app.js (versão 2 — via regex).
A versão anterior deste script procurava uma string fixa (?v=20260621a),
e abortava se a versão já tivesse sido bumpada antes. Esta versão acha
o app.js?v=QUALQUER_COISA atual e troca para um timestamp novo.

Uso (Termux), a partir da raiz do repo mobya-master:
  cp ~/storage/downloads/patch_bump_appjs_version_v2.py .
  python3 patch_bump_appjs_version_v2.py
"""
import re
import sys
from datetime import datetime, timezone

PATH = "index.html"

def abort(msg):
    print(f"❌ ABORT: {msg}")
    sys.exit(1)

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'(<script src="js/app\.js)(\?v=[^"]*)?(">\s*</script>)')
matches = pattern.findall(content)

if not matches:
    abort("Tag <script src=\"js/app.js...\"></script> não encontrada em index.html. Confira manualmente: grep app.js index.html")
if len(matches) > 1:
    abort(f"Tag encontrada {len(matches)}x — ambíguo, abortando.")

new_version = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
new_content, n = pattern.subn(rf'\1?v={new_version}\3', content)

if n != 1:
    abort(f"Substituição inesperada ({n}x) — abortando sem salvar.")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"✅ js/app.js bumpado para ?v={new_version}")
print("\n🎉 Patch aplicado com sucesso em", PATH)
