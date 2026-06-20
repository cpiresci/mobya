#!/usr/bin/env python3
"""
Patch Fase 4A — Resiliência GPS Frontend
- Buffer local de pings offline (memória + localStorage fallback)
- Flush automático ao reconectar o socket
- Polling REST GET /tracking/sessions/:id a cada 5s quando WS cai >10s
- Indicador visual diferenciado no gpsConnectionStatus

USO:
  cd ~/mobya-master
  python3 patch_gps_fase4a.py
  git add -A && git commit -m "feat: gps fase4a buffer offline + polling fallback" && git push
"""
import os, re

ROOT = os.getcwd()

def w(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[OK] escrito: {path}")

def patch_gps():
    path = os.path.join(ROOT, "js/gps-tracking.js")
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()

    if "offlineBuffer" in src:
        print("[SKIP] js/gps-tracking.js já tem offlineBuffer.")
        return

    # ── 1. Adiciona variáveis de resiliência após as declarações existentes ──
    old_vars = "  let socket=null,map=null,markers={},routeLine=null,watchId=null,sessionId=null,myRole=null,chatMsgs=[];"
    new_vars = (
        "  let socket=null,map=null,markers={},routeLine=null,watchId=null,sessionId=null,myRole=null,chatMsgs=[];\n"
        "  // Fase 4A — resiliência\n"
        "  let offlineBuffer=[];           // pings não enviados enquanto WS offline\n"
        "  let pollingTimer=null;          // setInterval do fallback REST\n"
        "  let wsOfflineSince=null;        // timestamp da desconexão\n"
        "  const OFFLINE_POLL_MS=5000;     // intervalo de polling REST\n"
        "  const OFFLINE_POLL_DELAY=10000; // só ativa polling após 10s offline\n"
        "  const BUFFER_KEY='mobya_gps_buf'; // chave localStorage\n"
    )
    if old_vars not in src:
        print("[ERRO] bloco de variáveis não encontrado — aplique manualmente.")
        return
    src = src.replace(old_vars, new_vars)

    # ── 2. Substitui connectSocket para adicionar lógica de buffer/polling ──
    old_connect = (
        "  function connectSocket(token){if(socket)socket.disconnect();"
        "socket=io(WS_BASE+'/gps',{auth:{token},transports:['websocket','polling'],"
        "reconnectionAttempts:10,reconnectionDelay:2000});"
        "socket.on('connect',()=>updateConnectionStatus('online'));"
        "socket.on('disconnect',()=>updateConnectionStatus('offline'));"
        "socket.on('connect_error',(e)=>{console.warn('[GPS]',e.message);updateConnectionStatus('reconectando');});"
    )
    new_connect = (
        "  function _loadBuffer(){try{const s=localStorage.getItem(BUFFER_KEY);return s?JSON.parse(s):[];}catch{return[];}}\n"
        "  function _saveBuffer(buf){try{localStorage.setItem(BUFFER_KEY,JSON.stringify(buf.slice(-50)));}catch{}}\n"
        "  function _flushBuffer(){\n"
        "    const buf=[...offlineBuffer,..._loadBuffer()];\n"
        "    offlineBuffer=[];\n"
        "    try{localStorage.removeItem(BUFFER_KEY);}catch{}\n"
        "    if(!buf.length)return;\n"
        "    buf.forEach(p=>{if(socket?.connected)socket.emit('send_location',p);});\n"
        "    console.log('[GPS] Flush de',buf.length,'pings offline.');\n"
        "  }\n"
        "  function _startPolling(){\n"
        "    if(pollingTimer||!sessionId)return;\n"
        "    pollingTimer=setInterval(async()=>{\n"
        "      if(socket?.connected){_stopPolling();return;}\n"
        "      try{\n"
        "        const r=await API.req('GET',`/tracking/sessions/${sessionId}`);\n"
        "        if(r?.data){updateSessionStatus(r.data.status);}\n"
        "        updateConnectionStatus('polling');\n"
        "      }catch(e){console.warn('[GPS] Polling falhou:',e.message);}\n"
        "    },OFFLINE_POLL_MS);\n"
        "    console.log('[GPS] Polling REST ativado.');\n"
        "  }\n"
        "  function _stopPolling(){\n"
        "    if(pollingTimer){clearInterval(pollingTimer);pollingTimer=null;}\n"
        "  }\n"
        "  function connectSocket(token){if(socket)socket.disconnect();"
        "socket=io(WS_BASE+'/gps',{auth:{token},transports:['websocket','polling'],"
        "reconnectionAttempts:10,reconnectionDelay:2000});"
        "socket.on('connect',()=>{\n"
        "    wsOfflineSince=null;\n"
        "    _stopPolling();\n"
        "    updateConnectionStatus('online');\n"
        "    setTimeout(_flushBuffer,500);\n"
        "  });\n"
        "  socket.on('disconnect',()=>{\n"
        "    wsOfflineSince=Date.now();\n"
        "    updateConnectionStatus('offline');\n"
        "    setTimeout(()=>{\n"
        "      if(!socket?.connected)_startPolling();\n"
        "    },OFFLINE_POLL_DELAY);\n"
        "  });\n"
        "  socket.on('connect_error',(e)=>{console.warn('[GPS]',e.message);updateConnectionStatus('reconectando');});\n"
    )
    if old_connect not in src:
        print("[ERRO] bloco connectSocket não encontrado — aplique manualmente.")
        return
    src = src.replace(old_connect, new_connect)

    # ── 3. Substitui send_location no watchPosition para bufferizar offline ──
    old_send = (
        "if(socket?.connected)socket.emit('send_location',{lat,lng,heading,speed,accuracy});"
    )
    new_send = (
        "if(socket?.connected){\n"
        "          socket.emit('send_location',{lat,lng,heading,speed,accuracy});\n"
        "        }else{\n"
        "          const ping={lat,lng,heading,speed,accuracy,ts:Date.now()};\n"
        "          offlineBuffer.push(ping);\n"
        "          if(offlineBuffer.length>50)offlineBuffer.shift();\n"
        "          _saveBuffer(offlineBuffer);\n"
        "        }"
    )
    if old_send not in src:
        print("[ERRO] bloco send_location no watchPosition não encontrado.")
        return
    src = src.replace(old_send, new_send)

    # ── 4. Atualiza updateConnectionStatus para suportar estado 'polling' ──
    old_status = (
        "  function updateConnectionStatus(s){const el=document.getElementById('gpsConnectionStatus');"
        "if(!el)return;const m={online:['● Online','#10b981'],offline:['● Offline','#ef4444'],"
        "reconectando:['◌ Reconectando','#f59e0b']};const[t,c]=m[s]||['',''];el.textContent=t;el.style.color=c;}"
    )
    new_status = (
        "  function updateConnectionStatus(s){const el=document.getElementById('gpsConnectionStatus');"
        "if(!el)return;const m={"
        "online:['● Online','#10b981'],"
        "offline:['● Offline','#ef4444'],"
        "reconectando:['◌ Reconectando','#f59e0b'],"
        "polling:['◎ Offline (atualizando)','#f59e0b']"
        "};const[t,c]=m[s]||['',''];el.textContent=t;el.style.color=c;}"
    )
    if old_status not in src:
        print("[ERRO] bloco updateConnectionStatus não encontrado.")
        return
    src = src.replace(old_status, new_status)

    # ── 5. Para o polling ao parar de assistir localização ──
    old_stop = (
        "  function stopWatchingLocation(){if(watchId!==null){"
        "navigator.geolocation.clearWatch(watchId);watchId=null;}updateGPSStatus('parado');}"
    )
    new_stop = (
        "  function stopWatchingLocation(){if(watchId!==null){"
        "navigator.geolocation.clearWatch(watchId);watchId=null;}"
        "_stopPolling();"
        "updateGPSStatus('parado');}"
    )
    if old_stop not in src:
        print("[ERRO] bloco stopWatchingLocation não encontrado.")
        return
    src = src.replace(old_stop, new_stop)

    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("[OK] js/gps-tracking.js atualizado (buffer offline + polling fallback)")

def run():
    print("=== Patch Fase 4A: GPS Resiliência (buffer offline + polling) ===")
    patch_gps()
    print()
    print("=== PRÓXIMOS PASSOS ===")
    print("git add -A && git commit -m 'feat: gps fase4a buffer offline + polling fallback' && git push")

if __name__ == "__main__":
    run()
