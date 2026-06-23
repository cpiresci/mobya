#!/usr/bin/env python3
# ============================================================================
# MOBYA · Patch v3: remove de vez a busca de prestador do GPS Tracking
# ----------------------------------------------------------------------------
# Decisão de arquitetura: js/gps-tracking.js agora é só o módulo "Waze"
# (navegação turn-by-turn + acompanhamento de sessão JÁ confirmada). Esperar
# o prestador aceitar uma emergência é responsabilidade exclusiva do
# js/ultra-gps.js (modo "discover"/sessão ativa).
#
# Esse patch é mais definitivo que o anterior (patch_gps_ghost_search.py, que
# só cancelava o loop ao navegar). Aqui a função inteira é removida: não tem
# mais polling, nem chamada à API de espera, nem leitura de
# window.__mobyaPendingEmergencyId — nada disso é mais responsabilidade do
# GPS Tracking.
#
# O que muda na prática:
#   - Se o GPS Tracking for aberto sem sessionId E sem prestador confirmado
#     ainda, ele mostra um aviso estático ("Acompanhe pelo Ultra GPS") em vez
#     de ficar chamando a API repetidamente.
#   - _waitForProviderAccept() e _setWaitingStatus() são removidas do arquivo.
#   - window.__mobyaPendingEmergencyId não é mais lido nem zerado aqui — só
#     o ultra-gps.js cuida dele agora.
#
# Idempotente: pode rodar várias vezes sem duplicar nada.
#
# Pré-requisito: rodar DEPOIS do patch_gps_ghost_search.py (este patch
# assume que o token de geração _renderGen/_pendingGen já existe; se não
# existir, o patch ainda funciona, só ignora essa parte).
#
# Uso (Termux):
#   cd ~/mobya-master
#   cp /storage/emulated/0/Download/patch_gps_remove_provider_wait.py .
#   python patch_gps_remove_provider_wait.py
#   git add -A && git commit -m "refactor: remove busca de prestador do GPS Tracking (responsabilidade exclusiva do Ultra GPS)"
#   git push
# ============================================================================
import os, sys

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

MARKER = '// [GPS-TRACKING] busca de prestador removida — responsabilidade exclusiva do Ultra GPS'
if MARKER in src:
    print('[SKIP] Patch já aplicado anteriormente. Nada a fazer.')
    sys.exit(0)

changes = 0

# --------------------------------------------------------------------------
# 1) No _bootMap(): troca a chamada de polling por um aviso estático
# --------------------------------------------------------------------------
# Variante COM token de geração (se patch_gps_ghost_search.py já foi aplicado)
old1a = """        }else if(window.__mobyaPendingEmergencyId){
          _waitForProviderAccept(window.__mobyaPendingEmergencyId,0,_pendingGen);
        }"""
# Variante SEM token de geração (arquivo original, antes do patch anterior)
old1b = """        }else if(window.__mobyaPendingEmergencyId){
          _waitForProviderAccept(window.__mobyaPendingEmergencyId);
        }"""

new1 = """        }else if(window.__mobyaPendingEmergencyId){
          // [GPS-TRACKING] busca de prestador removida — responsabilidade exclusiva do Ultra GPS
          _setWaitingStatus('Aguardando confirmação — acompanhe pelo Ultra GPS.');
        }"""

if old1a in src:
    src = src.replace(old1a, new1, 1); changes += 1
elif old1b in src:
    src = src.replace(old1b, new1, 1); changes += 1
else:
    print('[AVISO] Trecho 1 (_bootMap) não encontrado no formato esperado — pulei essa etapa.')

# --------------------------------------------------------------------------
# 2) Remove a função _waitForProviderAccept inteira, mantém _setWaitingStatus
#    (ela ainda é usada pelo aviso estático acima)
# --------------------------------------------------------------------------
# Variante COM token de geração
old2a = """  async function _waitForProviderAccept(emergencyId,attempt=0,gen=_pendingGen){
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
  }
"""
# Variante SEM token de geração (arquivo original)
old2b = """  async function _waitForProviderAccept(emergencyId,attempt=0){
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
  }
"""

if old2a in src:
    src = src.replace(old2a, '', 1); changes += 1
elif old2b in src:
    src = src.replace(old2b, '', 1); changes += 1
else:
    print('[AVISO] Trecho 2 (_waitForProviderAccept) não encontrado no formato esperado — pulei essa etapa.')
    print('        O arquivo pode já estar parcialmente diferente do esperado. Confira manualmente.')

if changes == 0:
    print('[ERRO] Nenhuma etapa foi aplicada. Nada foi alterado.')
    sys.exit(1)

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)

print(f'[OK] {changes}/2 etapas aplicadas em js/gps-tracking.js.')
if changes < 2:
    print('[AVISO] Patch parcial — revise o diff antes de subir (git diff js/gps-tracking.js).')
else:
    print('[OK] GPS Tracking não tem mais nenhuma lógica de busca/espera de prestador.')
    print('     Essa responsabilidade agora é 100% do Ultra GPS.')

print()
print('====================================================================')
print(' PRÓXIMOS PASSOS (Termux):')
print(f'   cd {ROOT}')
print('   git diff js/gps-tracking.js   # revise as mudanças')
print('   git add -A')
print('   git commit -m "refactor: remove busca de prestador do GPS Tracking (responsabilidade exclusiva do Ultra GPS)"')
print('   git push')
print('====================================================================')
