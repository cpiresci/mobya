window.GPSTracking = (() => {
  const API_BASE = (window.MOBYA?.API || 'https://mobya.onrender.com') + '/api/v1';
  const WS_BASE  = API_BASE.replace('/api/v1','').replace('https://','wss://').replace('http://','ws://');
  let socket=null,map=null,markers={},routeLine=null,watchId=null,sessionId=null,myRole=null,chatMsgs=[];
  // Pulso de sinal + trilha-cometa + barra de proximidade (visual quantum premium)
  let trailPts=[],trailLayer=null,_initialDistanceKm=null;
  // Fase 4A — resiliência
  let offlineBuffer=[];           // pings não enviados enquanto WS offline
  let pollingTimer=null;          // setInterval do fallback REST
  let wsOfflineSince=null;        // timestamp da desconexão
  const OFFLINE_POLL_MS=5000;     // intervalo de polling REST
  const OFFLINE_POLL_DELAY=10000; // só ativa polling após 10s offline
  const BUFFER_KEY='mobya_gps_buf'; // chave localStorage

  const STATUS_LABEL={AGUARDANDO:{text:'Aguardando prestador',color:'#f59e0b',icon:'⏳'},A_CAMINHO:{text:'Prestador a caminho',color:'#3b82f6',icon:'🚗'},CHEGOU:{text:'Prestador chegou!',color:'#8b5cf6',icon:'📍'},EM_SERVICO:{text:'Em atendimento',color:'#f97316',icon:'🔧'},CONCLUIDO:{text:'Serviço concluído',color:'#10b981',icon:'✅'},CANCELADO:{text:'Cancelado',color:'#ef4444',icon:'❌'}};
  function makeIcon(e,role){
    const isP=role==='PROVIDER';
    return L.divIcon({
      html:`<div class="gps-marker ${isP?'is-provider':'is-user'}">
              <div class="gps-marker-ring"></div>
              <div class="gps-marker-core">${e}</div>
            </div>`,
      iconSize:[42,42],iconAnchor:[21,21],className:''
    });
  }
  function initMap(id){if(map){map.remove();map=null;}map=L.map(id,{zoomControl:true,attributionControl:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);map.setView([-15.788,-47.879],15);return map;}
  // Trilha-cometa: desenha o caminho percorrido pelo prestador com opacidade
  // decrescente por idade — cada segmento "apaga" conforme fica mais antigo.
  function _pushTrail(lat,lng){
    trailPts.push([lat,lng]);
    if(trailPts.length>12)trailPts.shift();
    if(trailLayer){map.removeLayer(trailLayer);trailLayer=null;}
    if(trailPts.length<2)return;
    const group=L.layerGroup();
    for(let i=1;i<trailPts.length;i++){
      const t=i/(trailPts.length-1); // 0=mais antigo, 1=mais novo
      L.polyline([trailPts[i-1],trailPts[i]],{color:'#00f5ff',weight:3,opacity:.06+t*.46}).addTo(group);
    }
    trailLayer=group.addTo(map);
  }
  // Pulso de sinal: anel de radar que expande no instante exato em que um
  // novo ping de GPS chega — não é loop decorativo, é o dado em tempo real.
  function _pingSignal(role){
    const m=markers[role];if(!m)return;
    const el=m.getElement();if(!el)return;
    const ring=el.querySelector('.gps-marker-ring');if(!ring)return;
    ring.classList.remove('ping');
    void ring.offsetWidth; // reinicia a animação mesmo se já estava rodando
    ring.classList.add('ping');
  }
  function updateMarker(role,lat,lng,label){
    const isP=role==='PROVIDER';const e=isP?'🔧':'📍';
    const isNew=!markers[role];
    if(markers[role]){markers[role].setLatLng([lat,lng]);}
    else{markers[role]=L.marker([lat,lng],{icon:makeIcon(e,role)}).addTo(map).bindPopup(`<strong>${label}</strong>`);}
    if(!isNew)_pingSignal(role);
    if(isP)_pushTrail(lat,lng);
    if(markers.USER&&markers.PROVIDER){const pts=[markers.USER.getLatLng(),markers.PROVIDER.getLatLng()];if(routeLine){routeLine.setLatLngs(pts);}else{routeLine=L.polyline(pts,{color:'#7c3aed',weight:3,dashArray:'8 6',opacity:.6}).addTo(map);}map.fitBounds(L.latLngBounds(pts),{padding:[40,40],maxZoom:16});}else{map.setView([lat,lng],16);}
  }
  function _loadBuffer(){try{const s=localStorage.getItem(BUFFER_KEY);return s?JSON.parse(s):[];}catch{return[];}}
  function _saveBuffer(buf){try{localStorage.setItem(BUFFER_KEY,JSON.stringify(buf.slice(-50)));}catch{}}
  function _flushBuffer(){
    const buf=[...offlineBuffer,..._loadBuffer()];
    offlineBuffer=[];
    try{localStorage.removeItem(BUFFER_KEY);}catch{}
    if(!buf.length)return;
    buf.forEach(p=>{if(socket?.connected)socket.emit('send_location',p);});
    console.log('[GPS] Flush de',buf.length,'pings offline.');
  }
  function _startPolling(){
    if(pollingTimer||!sessionId)return;
    pollingTimer=setInterval(async()=>{
      if(socket?.connected){_stopPolling();return;}
      try{
        const r=await API.req('GET',`/tracking/sessions/${sessionId}`);
        if(r?.data){updateSessionStatus(r.data.status);}
        updateConnectionStatus('polling');
      }catch(e){console.warn('[GPS] Polling falhou:',e.message);}
    },OFFLINE_POLL_MS);
    console.log('[GPS] Polling REST ativado.');
  }
  function _stopPolling(){
    if(pollingTimer){clearInterval(pollingTimer);pollingTimer=null;}
  }
  function connectSocket(token){if(socket)socket.disconnect();socket=io(WS_BASE+'/gps',{auth:{token},transports:['websocket','polling'],reconnectionAttempts:10,reconnectionDelay:2000});socket.on('connect',()=>{
    wsOfflineSince=null;
    _stopPolling();
    updateConnectionStatus('online');
    setTimeout(_flushBuffer,500);
  });
  socket.on('disconnect',()=>{
    wsOfflineSince=Date.now();
    updateConnectionStatus('offline');
    setTimeout(()=>{
      if(!socket?.connected)_startPolling();
    },OFFLINE_POLL_DELAY);
  });
  socket.on('connect_error',(e)=>{console.warn('[GPS]',e.message);updateConnectionStatus('reconectando');});
socket.on('session_joined',({role,session})=>{myRole=role;_flushOwnPosition();updateSessionStatus(session.status);updateProviderControls(role);addChatMessage({text:`Você entrou como ${role==='USER'?'Cliente':'Prestador'}.`,from:'Sistema',role:'SYSTEM',ts:Date.now()});});socket.on('location_update',({role,lat,lng,name,eta})=>{updateMarker(role,lat,lng,name||role);if(eta&&role==='PROVIDER'){updateETA(eta);if(eta.geometry)drawRealRoute(eta.geometry);}});socket.on('status_changed',({status})=>{updateSessionStatus(status);const s=STATUS_LABEL[status];if(s)Toast.show(`${s.icon} ${s.text}`,status==='CONCLUIDO'?'ok':'info');if(['CONCLUIDO','CANCELADO'].includes(status))stopWatchingLocation();});socket.on('participant_online',({role,name})=>addChatMessage({text:`${name} entrou.`,from:'Sistema',role:'SYSTEM',ts:Date.now()}));socket.on('participant_offline',({role})=>addChatMessage({text:`${role==='USER'?'Cliente':'Prestador'} saiu.`,from:'Sistema',role:'SYSTEM',ts:Date.now()}));socket.on('chat_message',(msg)=>addChatMessage(msg));socket.on('error',({code})=>Toast.show(`Erro GPS: ${code}`,'error'));}
  // ── Estilos quantum premium do GPS (pulso de sinal, trilha, pills) ──
  function _injectStyles(){
    if(document.getElementById('gps-styles'))return;
    const s=document.createElement('style');s.id='gps-styles';
    s.textContent=`
      .gps-marker{position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center}
      .gps-marker-core{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:17px;border:2px solid rgba(255,255,255,.9);box-shadow:0 2px 12px rgba(0,0,0,.5);position:relative;z-index:2}
      .gps-marker.is-provider .gps-marker-core{background:linear-gradient(135deg,var(--q2,#7c3aed),var(--neon,#00f5ff))}
      .gps-marker.is-user .gps-marker-core{background:linear-gradient(135deg,var(--neon,#00f5ff),#fff)}
      .gps-marker-ring{position:absolute;inset:0;border-radius:50%;pointer-events:none}
      .gps-marker-ring.ping{animation:gpsPing 1.1s ease-out}
      @keyframes gpsPing{0%{box-shadow:0 0 0 0 rgba(0,245,255,.55)}100%{box-shadow:0 0 0 22px rgba(0,245,255,0)}}
      #gpsHeader{font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:2px;
        background:linear-gradient(90deg,var(--q4,#c084fc),var(--neon,#00f5ff));
        -webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .gps-pill-dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px;animation:pulse 1.6s infinite}
      .gps-status-chip{font-family:'JetBrains Mono',monospace;font-size:.74rem;font-weight:600;
        padding:4px 10px;border-radius:8px;border:1px solid;background:rgba(255,255,255,.04)}
      #gpsProximityWrap{height:5px;border-radius:3px;background:var(--s3,#111122);overflow:hidden;margin-top:6px}
      #gpsProximityFill{height:100%;width:0%;border-radius:3px;transition:width .6s ease,background .6s ease}
    `;
    document.head.appendChild(s);
  }
  function joinSession(sid){sessionId=sid;trailPts=[];_initialDistanceKm=null;if(trailLayer){map?.removeLayer(trailLayer);trailLayer=null;}if(!socket?.connected)return;socket.emit('join_session',{sessionId:sid});}
  let _pendingPos=null;
  function _flushOwnPosition(){if(_pendingPos&&myRole){const{lat,lng}=_pendingPos;_pendingPos=null;updateMarker(myRole,lat,lng,'Você');}}
  function startWatchingLocation(){if(!navigator.geolocation){Toast.show('GPS não disponível.','warn');return;}const opts={enableHighAccuracy:true,maximumAge:3000,timeout:10000};watchId=navigator.geolocation.watchPosition((pos)=>{const{latitude:lat,longitude:lng,heading,speed,accuracy}=pos.coords;if(socket?.connected){
          socket.emit('send_location',{lat,lng,heading,speed,accuracy});
        }else{
          const ping={lat,lng,heading,speed,accuracy,ts:Date.now()};
          offlineBuffer.push(ping);
          if(offlineBuffer.length>50)offlineBuffer.shift();
          _saveBuffer(offlineBuffer);
        }if(myRole){updateMarker(myRole,lat,lng,'Você');}else{_pendingPos={lat,lng};map&&map.setView([lat,lng],16);}},(err)=>console.warn('[GPS]',err.message),opts);updateGPSStatus('ativo');}
  function stopWatchingLocation(){if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}_stopPolling();updateGPSStatus('parado');}
  function updateProviderControls(role){const el=document.getElementById('gpsProviderControls');if(!el)return;el.style.display=role!=='PROVIDER'?'none':'';}
  function setStatus(status){if(!socket?.connected||!sessionId)return;socket.emit('update_status',{status});}
  function updateConnectionStatus(s){const el=document.getElementById('gpsConnectionStatus');if(!el)return;const m={online:['online','#00f5ff'],offline:['offline','#f43f5e'],reconectando:['reconectando','#fbbf24'],polling:['offline · atualizando','#fbbf24']};const[t,c]=m[s]||['',''];el.innerHTML=`<span class="gps-pill-dot" style="background:${c};box-shadow:0 0 6px ${c}"></span><span style="color:${c}">${t}</span>`;}
  function updateGPSStatus(s){const el=document.getElementById('gpsWatchStatus');if(!el)return;const on=s==='ativo';el.innerHTML=`<span class="gps-pill-dot" style="background:${on?'#10b981':'#6b6b90'}"></span><span style="color:${on?'#10b981':'#6b6b90'}">GPS ${on?'ativo':'parado'}</span>`;}
  function updateSessionStatus(status){const el=document.getElementById('gpsSessionStatus');if(!el)return;const s=STATUS_LABEL[status]||{text:status,color:'#6b6b90',icon:'•'};el.innerHTML=`<span class="gps-status-chip" style="border-color:${s.color}66;color:${s.color}">${s.icon} ${s.text}</span>`;}
  function updateETA({distanceKm,etaMinutes,source}){
    const el=document.getElementById('gpsETA');if(!el)return;
    if(_initialDistanceKm==null||distanceKm>_initialDistanceKm)_initialDistanceKm=distanceKm;
    const progress=_initialDistanceKm>0?Math.min(1,Math.max(0,1-(distanceKm/_initialDistanceKm))):0;
    const from=[244,63,94],to=[34,216,143];
    const mix=from.map((c,i)=>Math.round(c+(to[i]-c)*progress));
    const color=`rgb(${mix.join(',')})`;
    const tag=source==='osrm'?'':' ⚠️ estimado';
    el.innerHTML=`<span style="color:${color};font-weight:700">${distanceKm}km</span><span style="color:var(--muted)"> · chega em ~${etaMinutes}min${tag}</span>`;
    const bar=document.getElementById('gpsProximityFill');
    if(bar){bar.style.width=Math.round(progress*100)+'%';bar.style.background=color;bar.style.boxShadow=`0 0 8px ${color}`;}
  }
  function drawRealRoute(geometry){if(!map||!geometry?.length)return;const latlngs=geometry.map(([lng,lat])=>[lat,lng]);if(routeLine){map.removeLayer(routeLine);}routeLine=L.polyline(latlngs,{color:'#3b82f6',weight:4,opacity:.8}).addTo(map);}
  async function doCheckin(photoFile){
    if(!sessionId)return;
    if(!navigator.geolocation){Toast.show('GPS não disponível para check-in.','warn');return;}
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      const{latitude:lat,longitude:lng}=pos.coords;
      // TODO: upload real de foto — backend ainda não tem rota /uploads. Por ora envia photoUrl=null (geofence puro já funciona).
      const r=await API.req('POST',`/tracking/sessions/${sessionId}/checkin`,{lat,lng,photoUrl:null});
      if(r?.data?.validated){Toast.show('✅ Check-in validado! Pode marcar CHEGOU.','ok');}
      else{Toast.show(r?.message||'Check-in fora do raio permitido.','warn');}
    },(err)=>Toast.show('Não foi possível obter sua localização para check-in.','error'),{enableHighAccuracy:true,timeout:10000});
  }
  function promptCheckin(){doCheckin(null);}
  function addChatMessage({text,from,role,ts}){chatMsgs.push({text,from,role,ts});const el=document.getElementById('gpsChatMessages');if(!el)return;const isSystem=role==='SYSTEM';const isMe=role===myRole;const div=document.createElement('div');div.style.cssText=`display:flex;flex-direction:column;align-items:${isSystem?'center':isMe?'flex-end':'flex-start'};margin:4px 0`;div.innerHTML=isSystem?`<span style="font-size:.72rem;color:var(--muted);padding:2px 8px">${text}</span>`:`<div style="max-width:80%;background:${isMe?'var(--q4)':'var(--card-bg)'};color:${isMe?'#000':'var(--text)'};padding:7px 12px;border-radius:${isMe?'12px 12px 2px 12px':'12px 12px 12px 2px'};font-size:.83rem"><div style="font-size:.7rem;color:${isMe?'rgba(0,0,0,.5)':'var(--muted)'};margin-bottom:2px">${from}</div>${text}</div>`;el.appendChild(div);el.scrollTop=el.scrollHeight;}
  function sendChatMessage(text){if(!socket?.connected||!text?.trim())return;socket.emit('send_message',{text});}
  async function render(sid){
    const main=document.getElementById('main');if(!main)return;
    main.innerHTML=`<div style="display:flex;flex-direction:column;height:calc(100vh - 60px);gap:0"><div style="padding:14px 16px;background:linear-gradient(135deg,var(--s2),var(--s3));border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px"><div><div id="gpsHeader">📡 GPS TRACKING</div><div id="gpsSessionStatus" style="font-size:.82rem;margin-top:5px"><span style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.76rem">Conectando...</span></div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:150px"><span id="gpsConnectionStatus" style="font-family:'JetBrains Mono',monospace;font-size:.72rem"></span><span id="gpsWatchStatus" style="font-family:'JetBrains Mono',monospace;font-size:.72rem"></span><div style="width:100%"><span id="gpsETA" style="font-family:'JetBrains Mono',monospace;font-size:.78rem"></span><div id="gpsProximityWrap"><div id="gpsProximityFill"></div></div></div></div></div><div id="gpsMap" style="flex:1;min-height:260px;width:100%"></div><div id="gpsProviderControls" style="display:none;padding:10px 16px;background:var(--card-bg);border-top:1px solid var(--border)"><div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;font-weight:600">ATUALIZAR STATUS</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="GPSTracking.setStatus('A_CAMINHO')">🚗 A Caminho</button><button class="ai-btn" style="font-size:.75rem;padding:6px 12px;background:rgba(139,92,246,.15);color:#8b5cf6;border:1px solid rgba(139,92,246,.4)" onclick="GPSTracking.promptCheckin()">📸 Check-in (foto)</button><button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="GPSTracking.setStatus('CHEGOU')">📍 Cheguei</button><button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="GPSTracking.setStatus('EM_SERVICO')">🔧 Em Serviço</button><button class="ai-btn" style="font-size:.75rem;padding:6px 12px;background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.4)" onclick="GPSTracking.setStatus('CONCLUIDO')">✅ Concluído</button></div></div><div style="background:var(--card-bg);border-top:1px solid var(--border)"><div id="gpsChatMessages" style="height:110px;overflow-y:auto;padding:8px 14px;display:flex;flex-direction:column"></div><div style="display:flex;gap:8px;padding:8px 14px;border-top:1px solid var(--border)"><input id="gpsChatInput" placeholder="Mensagem rápida..." style="flex:1;background:var(--input-bg,rgba(255,255,255,.06));border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:.84rem;outline:none" onkeydown="if(event.key==='Enter'){GPSTracking.sendChatMessage(this.value);this.value='';}"><button class="ai-btn" style="padding:8px 14px;font-size:.82rem" onclick="const i=document.getElementById('gpsChatInput');GPSTracking.sendChatMessage(i.value);i.value=''">Enviar</button></div></div></div>`;
    _injectStyles();
    updateConnectionStatus('reconectando');
    updateGPSStatus('parado');
    setTimeout(()=>{initMap('gpsMap');const token=API.getToken();if(token){connectSocket(token);if(sid){setTimeout(()=>joinSession(sid),800);}else if(window.__mobyaPendingEmergencyId){_waitForProviderAccept(window.__mobyaPendingEmergencyId);}startWatchingLocation();}else{Toast.show('Faça login para usar o GPS.','warn');}},100);
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
  }
  async function createSession({quoteId,userId,vertical,address}){const r=await API.req('POST','/tracking/sessions',{quoteId,userId,vertical,address});return r.data;}
  async function openTracking(sid){await render(sid);if(sid)sessionId=sid;}
  return{render,openTracking,createSession,joinSession,setStatus,sendChatMessage,startWatchingLocation,stopWatchingLocation,promptCheckin};
})();
