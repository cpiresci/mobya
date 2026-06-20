#!/usr/bin/env python3
"""
Patch — Fecha o gap crítico no frontend (cliente + prestador chegam na tela
GPS Tracking sem sessionId nenhum).
USO:
  cd ~/mobya-master
  python3 patch_close_dispatch_gap_frontend.py
Depois:
  git add -A && git commit -m "fix: conectar SOS/accept-offer ao sessionId real do GPS Tracking" && git push
"""
import os

ROOT = os.getcwd()

def patch_file(path, old, new, label):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        print(f"[ERRO] {path} não encontrado.")
        return False
    with open(full, "r", encoding="utf-8") as f:
        content = f.read()
    if new in content:
        print(f"[SKIP] {label} já aplicado em {path}.")
        return True
    if old not in content:
        print(f"[ERRO] Trecho esperado não encontrado em {path} — aplique manualmente: {label}")
        return False
    content = content.replace(old, new, 1)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[OK] {label} aplicado em {path}")
    return True

def run():
    print("=== Patch: fechar gap dispatch → GPS Tracking (frontend) ===")

    # 1. app.js — handler da rota lê sessionId pendente
    patch_file(
        "js/app.js",
        """  'gps-tracking': () => {
    const user = MobyaAuth.getUser();
    if (!user) { MobyaAuth.showLogin('gps-tracking'); return; }
    if (typeof GPSTracking!=='undefined') GPSTracking.render();
    else comingSoon('GPS TRACKING','📡');
  },""",
        """  'gps-tracking': () => {
    const user = MobyaAuth.getUser();
    if (!user) { MobyaAuth.showLogin('gps-tracking'); return; }
    const sid = window.__mobyaTrackingSessionId || null;
    window.__mobyaTrackingSessionId = null;
    if (typeof GPSTracking!=='undefined') GPSTracking.render(sid);
    else comingSoon('GPS TRACKING','📡');
  },""",
        "handler gps-tracking lê sessionId pendente",
    )

    # 2. dispatch-ui.js — accept() guarda sessionId retornado
    patch_file(
        "js/dispatch-ui.js",
        """      const r = await API.req('POST', `/emergency/${emergencyId}/accept-offer`);
      if (r?.success) {
        if (typeof Toast !== 'undefined') Toast.show('✅ Oferta aceita! Abra o GPS Tracking para iniciar.', 'ok');
        // Abre tracking automaticamente se possível
        if (typeof App !== 'undefined') App.navigate('gps-tracking');""",
        """      const r = await API.req('POST', `/emergency/${emergencyId}/accept-offer`);
      if (r?.success) {
        if (typeof Toast !== 'undefined') Toast.show('✅ Oferta aceita! Abrindo GPS Tracking...', 'ok');
        window.__mobyaPendingEmergencyId = null;
        window.__mobyaTrackingSessionId = r?.data?.sessionId || null;
        if (typeof App !== 'undefined') App.navigate('gps-tracking');""",
        "dispatch-ui.js guarda sessionId retornado no accept",
    )

    # 3. pages.js — fluxo SOS guarda emergencyId pendente
    patch_file(
        "js/pages.js",
        """        await API.emergency.create({ type, description: desc || label, ...coords });
        close();
        App.toast(`🚨 Emergência registrada! Buscando prestador próximo…`, 'ok');
        if (typeof Chat !== 'undefined') Chat.inject(`Tive ${label.toLowerCase()}. ${desc || ''}`);
        App.navigate('gps-tracking');""",
        """        const created = await API.emergency.create({ type, description: desc || label, ...coords });
        close();
        App.toast(`🚨 Emergência registrada! Buscando prestador próximo…`, 'ok');
        if (typeof Chat !== 'undefined') Chat.inject(`Tive ${label.toLowerCase()}. ${desc || ''}`);
        window.__mobyaPendingEmergencyId = created?.data?.id || null;
        App.navigate('gps-tracking');""",
        "pages.js guarda emergencyId pendente no fluxo SOS",
    )

    # 4. gps-tracking.js — render() espera aceite via polling quando não há sid
    patch_file(
        "js/gps-tracking.js",
        """    setTimeout(()=>{initMap('gpsMap');const token=API.getToken();if(token){connectSocket(token);if(sid){setTimeout(()=>joinSession(sid),800);}startWatchingLocation();}else{Toast.show('Faça login para usar o GPS.','warn');}},100);
  }""",
        """    setTimeout(()=>{initMap('gpsMap');const token=API.getToken();if(token){connectSocket(token);if(sid){setTimeout(()=>joinSession(sid),800);}else if(window.__mobyaPendingEmergencyId){_waitForProviderAccept(window.__mobyaPendingEmergencyId);}startWatchingLocation();}else{Toast.show('Faça login para usar o GPS.','warn');}},100);
  }
  function _setWaitingStatus(msg){const el=document.getElementById('gpsSessionStatus');if(el)el.innerHTML=`<span style="color:#f59e0b">⏳ ${msg}</span>`;}
  async function _waitForProviderAccept(emergencyId,attempt=0){
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
  }""",
        "gps-tracking.js polling de espera pelo aceite do prestador",
    )

    print()
    print("=== PRÓXIMO PASSO ===")
    print("git add -A && git commit -m 'fix: conectar SOS/accept-offer ao sessionId real do GPS Tracking' && git push")

if __name__ == "__main__":
    run()
