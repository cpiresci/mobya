#!/usr/bin/env python3
import os, sys
BASE = os.path.dirname(os.path.abspath(__file__))

def patch_file(rel_path, ops):
    path = os.path.join(BASE, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    for i, (old, new) in enumerate(ops, 1):
        if old not in src:
            print(f"[ERRO] bloco #{i} NAO encontrado. Abortando.")
            sys.exit(1)
        src = src.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f"[OK] {rel_path}")

patch_file('js/home-premium.js', [
    ('if (statProv && providers.length) statProv.textContent = providers.length;',
     '/* agentes NEXUS fixo — nao sobrescrever */')
])
print("Patch concluido.")
