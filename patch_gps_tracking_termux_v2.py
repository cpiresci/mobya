#!/usr/bin/env python3
# ============================================================================
# MOBYA · Patch v2: força atualização de cache do GPS Tracking (Leaflet)
# ----------------------------------------------------------------------------
# IMPORTANTE: esta versão NÃO toca em nenhuma tag do Mapbox GL no index.html.
# O Mapbox GL (mapbox-gl.css / mapbox-gl.js) continua sendo usado pelo
# js/ultra-gps.js, que não foi (e não deve ser) convertido para Leaflet.
# A v1 deste script removia essas tags por engano — corrigido aqui.
#
# O que este patch faz (idempotente, pode rodar quantas vezes quiser):
#   1. Sanity check: confirma que js/gps-tracking.js não tem mais "mapbox"
#   2. Bump do cache-buster (?v=...) SOMENTE na tag <script> de
#      js/gps-tracking.js e de js/ultra-gps.js — nada mais é alterado
#   3. NÃO remove, NÃO move, NÃO toca em nenhuma linha do Mapbox GL
#
# Uso (a partir da raiz do repo mobya-master no Termux):
#   cd ~/mobya-master
#   cp /storage/emulated/0/Download/patch_gps_tracking_termux_v2.py .
#   python patch_gps_tracking_termux_v2.py
#   git add -A && git commit -m "fix: bump cache-buster do GPS Tracking (sem tocar no Mapbox/ultra-gps)"
#   git push
# ============================================================================
import re, os, sys, time

REPO_CANDIDATES = ['.', os.path.expanduser('~/mobya-master'), os.path.expanduser('~/storage/shared/mobya-master')]

def find_repo_root():
    for c in REPO_CANDIDATES:
        idx = os.path.join(c, 'index.html')
        if os.path.isfile(idx) and os.path.isdir(os.path.join(c, 'js')):
            return os.path.abspath(c)
    print('[ERRO] Não encontrei index.html + js/ em nenhum candidato.')
    print('       Rode este script de dentro da raiz do repo mobya-master (use cd).')
    sys.exit(1)

ROOT = find_repo_root()
INDEX = os.path.join(ROOT, 'index.html')
GPS_JS = os.path.join(ROOT, 'js', 'gps-tracking.js')
ULTRA_JS = os.path.join(ROOT, 'js', 'ultra-gps.js')

print(f'[OK] Repo encontrado em: {ROOT}')

# --------------------------------------------------------------------------
# 1) Sanity checks (somente leitura, não altera nada)
# --------------------------------------------------------------------------
if os.path.isfile(GPS_JS):
    with open(GPS_JS, encoding='utf-8') as f:
        gps_src = f.read()
    if re.search(r'mapbox', gps_src, re.I):
        print('[AVISO] js/gps-tracking.js ainda contém referências a "mapbox" — verifique manualmente.')
    else:
        print('[OK] js/gps-tracking.js confirmado 100% Leaflet (sem "mapbox").')
else:
    print('[AVISO] js/gps-tracking.js não encontrado em', GPS_JS)

if os.path.isfile(ULTRA_JS):
    with open(ULTRA_JS, encoding='utf-8') as f:
        ultra_src = f.read()
    if re.search(r'mapbox', ultra_src, re.I):
        print('[OK] js/ultra-gps.js continua usando Mapbox GL — como esperado (não convertido, não mexemos nele).')
    else:
        print('[INFO] js/ultra-gps.js não tem "mapbox" no código — confira se ele realmente ainda precisa do Mapbox GL.')

with open(INDEX, encoding='utf-8') as f:
    html = f.read()

if re.search(r'mapbox-gl', html, re.I):
    print('[OK] Tags do Mapbox GL presentes no index.html — MANTIDAS (necessárias para ultra-gps.js).')
else:
    print('[AVISO] Não encontrei tags do Mapbox GL no index.html. Se ultra-gps.js ainda depende dele, isso vai quebrar.')

# --------------------------------------------------------------------------
# 2) Bump do cache-buster — ÚNICA alteração feita por este script
# --------------------------------------------------------------------------
stamp = str(int(time.time()))  # timestamp único garante cache-bust real

def bump(src, filename):
    pattern = re.compile(r'(js/' + re.escape(filename) + r'\?v=)[^"\']*', re.I)
    new_src, n = pattern.subn(r'\g<1>' + stamp, src)
    if n:
        print(f'[OK] Cache-buster de {filename} atualizado para ?v={stamp}')
    else:
        print(f'[AVISO] Não encontrei "{filename}?v=" no index.html — verifique manualmente a tag <script>.')
    return new_src

html_new = bump(html, 'gps-tracking.js')
html_new = bump(html_new, 'ultra-gps.js')

if html_new != html:
    with open(INDEX, 'w', encoding='utf-8') as f:
        f.write(html_new)
else:
    print('[INFO] Nada a alterar no index.html (cache-busters já estavam ok ou não encontrados).')

print()
print('====================================================================')
print(' RESUMO:')
print('   - Nenhuma tag do Mapbox GL foi tocada (ultra-gps.js continua intacto).')
print('   - Apenas o ?v= dos scripts gps-tracking.js e ultra-gps.js foi atualizado.')
print()
print(' PRÓXIMOS PASSOS (Termux):')
print(f'   cd {ROOT}')
print('   git add -A')
print('   git commit -m "fix: bump cache-buster do GPS Tracking (sem tocar no Mapbox/ultra-gps)"')
print('   git push')
print()
print(' Depois do push, force refresh no navegador (Ctrl+Shift+R ou aba anônima)')
print(' para descartar o cache antigo da CDN do GitHub Pages / mobya.com.br.')
print('====================================================================')
