#!/usr/bin/env python3
import os, sys

BASE = os.path.dirname(os.path.abspath(__file__))

def patch_file(rel_path, ops):
    path = os.path.join(BASE, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    for i, (old, new) in enumerate(ops, 1):
        if old not in src:
            print(f"[ERRO] {rel_path} — bloco #{i} NAO encontrado. Abortando.")
            sys.exit(1)
        src = src.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print(f"[OK] {rel_path} — {len(ops)} substituicao(oes) aplicada(s).")

CSS_OLD = ".bn-wrap{display:flex;align-items:stretch;height:100%}"
CSS_NEW = ".bn-wrap{display:flex;align-items:stretch;height:100%;width:100%}"

if __name__ == '__main__':
    patch_file('css/style.css', [(CSS_OLD, CSS_NEW)])
    print("Patch concluido.")
