#!/usr/bin/env python3
# ============================================================================
# MOBYA · Patch: cancela busca de prestador "fantasma" no GPS Tracking
# ----------------------------------------------------------------------------
# BUG: _waitForProviderAccept() usa setTimeout recursivo sem nenhuma forma de
# cancelamento. Se o usuário aciona o SOS (que navega pro Ultra GPS), mas em
# algum momento a página 'gps-tracking' também foi renderizada (ex: fluxo de
# emergência antigo, ou abertura rápida antes do redirect), o loop de espera
# do GPS Tracking continua rodando sozinho em background — chamando a API
# repetidamente por até 60s ("Buscando prestador mais próximo...") mesmo com
# a tela já trocada pro Ultra GPS.
#
# FIX: token de geração (_renderGen). Toda chamada a render() incrementa o
# contador; o loop de espera carrega o número da geração em que nasceu e, se
# ela não for mais a atual (ou seja, o usuário navegou pra outro lugar), o
# loop se cancela sozinho na próxima iteração — sem nenhuma chamada extra à
# API e sem precisar tocar em ultra-gps.js.
#
# Idempotente: pode rodar várias vezes sem duplicar nada.
#
# Uso (Termux):
#   cd ~/mobya-master
#   cp /storage/emulated/0/Download/patch_gps_ghost_search.py .
#   python patch_gps_ghost_search.py
#   git add -A && git commit -m "fix: cancela busca de prestador fantasma no GPS Tracking ao navegar pra outra tela"
#   git push
# ============================================================================
import os, re, sys

REPO_CANDIDATES = ['.', os.path.expanduser('~/mobya-master'), os.path.expanduser('~/storage/shared/mobya-master')]

def find_repo_root():
    for c in REPO_CANDIDATES:
        p = os.path.join(c, 'js', 'gps-tracking.js')
        if os.path.isfile(p):
            return os.path.abspath(c)
    print('[ERRO] Não encontrei js/gps-tracking.js em nenhum candidato.')
    print('       Rode este script de dentro da raiz do repo mobya-master.')
    sys.exit(1)

ROOT = find_repo_root()
PATH = os.path.join(ROOT, 'js', 'gps-tracking.js')
print(f'[OK] Arquivo: {PATH}')

with open(PATH, encoding='utf-8') as f:
    src = f.read()

if '_renderGen' in src:
    print('[SKIP] Patch já aplicado anteriormente (_renderGen já existe). Nada a fazer.')
    sys.exit(0)

orig = src
changes = 0

# --------------------------------------------------------------------------
# 1) Declara o contador de geração junto das outras variáveis de estado
# --------------------------------------------------------------------------
old1 = "let socket=null,map=null,markers={},routeLine=null,watchId=null,sessionId=null,myRole=null,chatMsgs=[];"
new1 = old1 + "\n  let _renderGen=0,_pendingGen=0; // token de geração: cancela loops de espera ao navegar pra outra tela"
if old1 in src:
    src = src.replace(old1, new1, 1)
    changes += 1
else:
    print('[AVISO] Trecho 1 (declaração de variáveis) não encontrado — pulei essa etapa.')

# --------------------------------------------------------------------------
# 2) render(): incrementa a geração e guarda o token desta renderização
# --------------------------------------------------------------------------
old2 = "  async function render(sid){\n    const main=document.getElementById('main');if(!main)return;"
new2 = "  async function render(sid){\n    const main=document.getElementById('main');if(!main)return;\n    _renderGen++;const _myGen=_renderGen; // nova geração: invalida loops de espera de renders anteriores"
if old2 in src:
    src = src.replace(old2, new2, 1)
    changes += 1
else:
    print('[AVISO] Trecho 2 (início de render()) não encontrado — pulei essa etapa.')

old3 = "      _pendingToken=token;_pendingSid=sid||null;\n      _bootMap();"
new3 = "      _pendingToken=token;_pendingSid=sid||null;_pendingGen=_myGen;\n      _bootMap();"
if old3 in src:
    src = src.replace(old3, new3, 1)
    changes += 1
else:
    print('[AVISO] Trecho 3 (setTimeout do render) não encontrado — pulei essa etapa.')

# --------------------------------------------------------------------------
# 3) _bootMap(): passa o token de geração pro _waitForProviderAccept
# --------------------------------------------------------------------------
old4 = "        }else if(window.__mobyaPendingEmergencyId){\n          _waitForProviderAccept(window.__mobyaPendingEmergencyId);\n        }"
new4 = "        }else if(window.__mobyaPendingEmergencyId){\n          _waitForProviderAccept(window.__mobyaPendingEmergencyId,0,_pendingGen);\n        }"
if old4 in src:
    src = src.replace(old4, new4, 1)
    changes += 1
else:
    print('[AVISO] Trecho 4 (chamada em _bootMap) não encontrado — pulei essa etapa.')

# --------------------------------------------------------------------------
# 4) _waitForProviderAccept(): recebe o token e se autocancela se obsoleto
# --------------------------------------------------------------------------
old5 = """  async function _waitForProviderAccept(emergencyId,attempt=0){
    const MAX_ATTEMPTS=20,DELAY_MS=3000; // ~60s de espera
    _setWaitingStatus('Buscando prestador mais próximo...');
    try{
      const r=await API.req('GET',`/emergency/${emergencyId}/tracking-session`);
      if(r?.data?.sessionId){
        window.__mobyaPendingEmergencyId=null;
        sessionId=r.data.sessionId;
        Toast.show('✅ Prestador encontrado! Conectando rastreamento...','ok');
        joinSession(sessionId);
        return;
      }
    }catch(e){/* ainda não aceitou — normal, continua tentando */}
    if(attempt>=MAX_ATTEMPTS){
      _setWaitingStatus('Nenhum prestador aceitou ainda. Tente novamente em alguns instantes.');
      return;
    }
    setTimeout(()=>_waitForProviderAccept(emergencyId,attempt+1),DELAY_MS);
  }"""

new5 = """  async function _waitForProviderAccept(emergencyId,attempt=0,gen=_pendingGen){
    const MAX_ATTEMPTS=20,DELAY_MS=3000; // ~60s de espera
    if(gen!==_renderGen)return; // usuário já saiu desta tela (renderizou outra) — cancela o loop fantasma
    _setWaitingStatus('Buscando prestador mais próximo...');
    try{
      const r=await API.req('GET',`/emergency/${emergencyId}/tracking-session`);
      if(r?.data?.sessionId){
        window.__mobyaPendingEmergencyId=null;
        sessionId=r.data.sessionId;
        Toast.show('✅ Prestador encontrado! Conectando rastreamento...','ok');
        joinSession(sessionId);
        return;
      }
    }catch(e){/* ainda não aceitou — normal, continua tentando */}
    if(gen!==_renderGen)return; // checa de novo após o await — pode ter navegado durante a chamada à API
    if(attempt>=MAX_ATTEMPTS){
      _setWaitingStatus('Nenhum prestador aceitou ainda. Tente novamente em alguns instantes.');
      return;
    }
    setTimeout(()=>_waitForProviderAccept(emergencyId,attempt+1,gen),DELAY_MS);
  }"""

if old5 in src:
    src = src.replace(old5, new5, 1)
    changes += 1
else:
    print('[AVISO] Trecho 5 (corpo de _waitForProviderAccept) não encontrado — pulei essa etapa.')
    print('        (provavelmente o arquivo do seu repo está formatado diferente do esperado)')

if changes == 0:
    print('[ERRO] Nenhuma das 5 etapas foi aplicada. Nada foi alterado. Confira o arquivo manualmente.')
    sys.exit(1)

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)

print(f'[OK] {changes}/5 etapas aplicadas em js/gps-tracking.js.')
if changes < 5:
    print('[AVISO] Patch parcial — revise o diff (git diff js/gps-tracking.js) antes de subir.')

print()
print('====================================================================')
print(' PRÓXIMOS PASSOS (Termux):')
print(f'   cd {ROOT}')
print('   git diff js/gps-tracking.js   # revise as mudanças')
print('   git add -A')
print('   git commit -m "fix: cancela busca de prestador fantasma no GPS Tracking ao navegar pra outra tela"')
print('   git push')
print('====================================================================')
