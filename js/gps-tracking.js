window.GPSTracking = (() => {
  const API_BASE = (window.MOBYA?.API || 'https://mobya.onrender.com') + '/api/v1';
  const WS_BASE  = API_BASE.replace('/api/v1','').replace('https://','wss://').replace('http://','ws://');
  const MBX_TOKEN_KEY = 'mbx_token';
  let socket=null,map=null,markers={},routeLine=null,watchId=null,sessionId=null,myRole=null,chatMsgs=[];
  // Pulso de sinal + trilha-cometa + barra de proximidade (visual quantum premium)
  let trailPts=[],_trailIds=[],_initialDistanceKm=null;
  // Fase 4A — resiliência
  let offlineBuffer=[];           // pings não enviados enquanto WS offline
  let pollingTimer=null;          // setInterval do fallback REST
  let wsOfflineSince=null;        // timestamp da desconexão
  const OFFLINE_POLL_MS=5000;     // intervalo de polling REST
  const OFFLINE_POLL_DELAY=10000; // só ativa polling após 10s offline
  const BUFFER_KEY='mobya_gps_buf'; // chave localStorage
  const TRAIL_MAX=12;
  let _mapReady=null; // promise resolvida quando o estilo do mapa carrega

  const STATUS_LABEL={AGUARDANDO:{text:'Aguardando prestador',color:'#f59e0b',icon:'⏳'},A_CAMINHO:{text:'Prestador a caminho',color:'#3b82f6',icon:'🚗'},CHEGOU:{text:'Prestador chegou!',color:'#8b5cf6',icon:'📍'},EM_SERVICO:{text:'Em atendimento',color:'#f97316',icon:'🔧'},CONCLUIDO:{text:'Serviço concluído',color:'#10b981',icon:'✅'},CANCELADO:{text:'Cancelado',color:'#ef4444',icon:'❌'}};

  function getMapboxToken(){
    return window.MOBYA?.MAPBOX_TOKEN || localStorage.getItem(MBX_TOKEN_KEY) || null;
  }

  function _markerEl(e,role){
    const isP=role==='PROVIDER';
    const div=document.createElement('div');
    div.className=`gps-marker ${isP?'is-provider':'is-user'}`;
    div.innerHTML=`<div class="gps-marker-ring"></div><div class="gps-marker-core">${e}</div>`;
    return div;
  }

  // initMap agora retorna uma Promise que resolve quando o estilo carregou
  // (necessário porque addLayer/addSource do Mapbox exigem 'load' disparado).
  function initMap(id){
    if(map){try{map.remove();}catch{}map=null;}
    markers={};routeLine=null;trailPts=[];_trailIds=[];
    _mapReady=new Promise((resolve)=>{
      map=new mapboxgl.Map({
        container:id,
        style:'mapbox://styles/mapbox/dark-v11',
        center:[-47.879,-15.788],
        zoom:15,
        pitch:0,
        attributionControl:false,
      });
      map.addControl(new mapboxgl.NavigationControl({showCompass:false}),'bottom-right');
      map.on('load',()=>resolve(map));
      map.on('error',(e)=>console.warn('[GPS][Mapbox]',e?.error?.message||e));
    });
    return _mapReady;
  }

  // Trilha-cometa: desenha o caminho percorrido pelo prestador com opacidade
  // decrescente por idade — cada segmento "apaga" conforme fica mais antigo.
  function _clearTrail(){
    if(!map)return;
    _trailIds.forEach(id=>{
      if(map.getLayer(id))map.removeLayer(id);
      if(map.getSource(id))map.removeSource(id);
    });
    _trailIds=[];
  }
  function _pushTrail(lat,lng){
    if(!map)return;
    trailPts.push([lng,lat]); // Mapbox usa [lng,lat]
    if(trailPts.length>TRAIL_MAX)trailPts.shift();
    _clearTrail();
    if(trailPts.length<2)return;
    for(let i=1;i<trailPts.length;i++){
      const t=i/(trailPts.length-1); // 0=mais antigo, 1=mais novo
      const id=`gps-trail-${i}`;
      map.addSource(id,{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[trailPts[i-1],trailPts[i]]}}});
      map.addLayer({id,type:'line',source:id,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#00f5ff','line-width':3,'line-opacity':.06+t*.46}});
      _trailIds.push(id);
    }
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
  function _fitBounds(pts){
    if(!map||!pts.length)return;
    if(pts.length===1){map.easeTo({center:pts[0],zoom:16,duration:600});return;}
    const b=pts.reduce((bb,p)=>bb.extend(p),new mapboxgl.LngLatBounds(pts[0],pts[0]));
    map.fitBounds(b,{padding:60,maxZoom:16,duration:600});
  }
  function updateMarker(role,lat,lng,label){
    if(!map)return;
    const isP=role==='PROVIDER';const e=isP?'🔧':'📍';
    const isNew=!markers[role];
    const lngLat=[lng,lat];
    if(markers[role]){
      markers[role].setLngLat(lngLat);
    }else{
      const el=_markerEl(e,role);
      markers[role]=new mapboxgl.Marker({element:el,anchor:'center'})
        .setLngLat(lngLat)
        .setPopup(new mapboxgl.Popup({offset:24,className:'gps-popup'}).setHTML(`<strong>${label}</strong>`))
        .addTo(map);
    }
    if(!isNew)_pingSignal(role);
    if(isP)_pushTrail(lat,lng);
    if(markers.USER&&markers.PROVIDER){
      const pts=[markers.USER.getLngLat().toArray(),markers.PROVIDER.getLngLat().toArray()];
      _setRouteLine(pts,{color:'#7c3aed',width:3,dash:[2,1.5],opacity:.6});
      _fitBounds(pts);
    }else{
      map.easeTo({center:lngLat,zoom:16,duration:600});
    }
  }
  function _setRouteLine(coords,{color,width,dash,opacity}={}){
    if(!map)return;
    const id='gps-route-line';
    const data={type:'Feature',geometry:{type:'LineString',coordinates:coords}};
    if(map.getSource(id)){
      map.getSource(id).setData(data);
    }else{
      map.addSource(id,{type:'geojson',data});
      map.addLayer({id,type:'line',source:id,layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':color||'#3b82f6','line-width':width||4,'line-opacity':opacity??.8,...(dash?{'line-dasharray':dash}:{})}});
    }
    routeLine=true;
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
      .mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}
      .mapboxgl-popup-content{background:var(--card-bg,#15152b);border:1px solid var(--border,#2a2a45);color:var(--text,#eee);
        border-radius:10px;padding:10px 14px;font-family:inherit;box-shadow:0 8px 32px rgba(0,0,0,.6)}
      .mapboxgl-popup-tip{display:none}
      #gpsTokenGate{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        background:var(--s2,#0b0b18);z-index:30;padding:20px}
      #gpsTokenGate .gtg-card{background:var(--card-bg,#15152b);border:1px solid var(--border,#2a2a45);border-radius:14px;
        padding:22px;max-width:340px;width:100%}
      #gpsTokenGate h3{font-size:1rem;margin-bottom:8px}
      #gpsTokenGate p{font-size:.78rem;color:var(--muted,#9090b0);margin-bottom:14px;line-height:1.5}
      #gpsTokenInput{width:100%;padding:9px 11px;background:var(--s3,#111122);border:1px solid var(--border,#2a2a45);
        border-radius:8px;color:var(--text,#eee);font-family:monospace;font-size:.74rem;margin-bottom:10px}
    `;
    document.head.appendChild(s);
  }
  function joinSession(sid){sessionId=sid;trailPts=[];_initialDistanceKm=null;_clearTrail();if(!socket?.connected)return;socket.emit('join_session',{sessionId:sid});}
  let _pendingPos=null;
  function _flushOwnPosition(){if(_pendingPos&&myRole){const{lat,lng}=_pendingPos;_pendingPos=null;updateMarker(myRole,lat,lng,'Você');}}
  function startWatchingLocation(){if(!navigator.geolocation){Toast.show('GPS não disponível.','warn');return;}const opts={enableHighAccuracy:true,maximumAge:3000,timeout:10000};watchId=navigator.geolocation.watchPosition((pos)=>{const{latitude:lat,longitude:lng,heading,speed,accuracy}=pos.coords;if(socket?.connected){
          socket.emit('send_location',{lat,lng,heading,speed,accuracy});
        }else{
          const ping={lat,lng,heading,speed,accuracy,ts:Date.now()};
          offlineBuffer.push(ping);
          if(offlineBuffer.length>50)offlineBuffer.shift();
          _saveBuffer(offlineBuffer);
        }if(myRole){updateMarker(myRole,lat,lng,'Você');}else{_pendingPos={lat,lng};map&&map.easeTo({center:[lng,lat],zoom:16,duration:400});}},(err)=>console.warn('[GPS]',err.message),opts);updateGPSStatus('ativo');}
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
  function drawRealRoute(geometry){
    if(!map||!geometry?.length)return;
    // geometry vem como [[lng,lat],...] (GeoJSON / OSRM) — já no formato nativo do Mapbox.
    _setRouteLine(geometry,{color:'#3b82f6',width:4,opacity:.8});
  }
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
  function escHtml(t){return String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function addChatMessage({text,from,role,ts}){chatMsgs.push({text,from,role,ts});const el=document.getElementById('gpsChatMessages');if(!el)return;const isSystem=role==='SYSTEM';const isMe=role===myRole;const div=document.createElement('div');div.style.cssText=`display:flex;flex-direction:column;align-items:${isSystem?'center':isMe?'flex-end':'flex-start'};margin:4px 0`;div.innerHTML=isSystem?`<span style="font-size:.72rem;color:var(--muted);padding:2px 8px">${escHtml(text)}</span>`:`<div style="max-width:80%;background:${isMe?'var(--q4)':'var(--card-bg)'};color:${isMe?'#000':'var(--text)'};padding:7px 12px;border-radius:${isMe?'12px 12px 2px 12px':'12px 12px 12px 2px'};font-size:.83rem"><div style="font-size:.7rem;color:${isMe?'rgba(0,0,0,.5)':'var(--muted)'};margin-bottom:2px">${escHtml(from)}</div>${escHtml(text)}</div>`;el.appendChild(div);el.scrollTop=el.scrollHeight;}
  function sendChatMessage(text){if(!socket?.connected||!text?.trim())return;socket.emit('send_message',{text});}
  function _renderTokenGate(container){
    container.innerHTML=`<div id="gpsTokenGate"><div class="gtg-card">
      <h3>🗺️ Token Mapbox necessário</h3>
      <p>O GPS Tracking agora usa Mapbox GL JS. Cole seu token público (pk.eyJ...) para ativar o mapa. Crie grátis em <strong>mapbox.com</strong>. Fica salvo só neste navegador.</p>
      <input id="gpsTokenInput" placeholder="pk.eyJ1IjoiYWJj...">
      <button class="ai-btn" style="width:100%" id="gpsTokenBtn">Ativar mapa</button>
    </div></div>`;
    document.getElementById('gpsTokenBtn').onclick=()=>{
      const v=document.getElementById('gpsTokenInput').value.trim();
      if(!v.startsWith('pk.')){Toast.show('Token inválido — deve começar com pk.','warn');return;}
      try{localStorage.setItem(MBX_TOKEN_KEY,v);}catch{}
      _bootMap();
    };
  }
  let _pendingSid=null,_pendingToken=null;
  function _bootMap(){
    const token=getMapboxToken();
    if(!token){_renderTokenGate(document.getElementById('gpsMapWrap'));return;}
    mapboxgl.accessToken=token;
    const wrap=document.getElementById('gpsMapWrap');
    if(wrap)wrap.innerHTML='<div id="gpsMap" style="width:100%;height:100%"></div>';
    initMap('gpsMap').then(()=>{
      const tk=_pendingToken;
      if(tk){
        connectSocket(tk);
        // Aguarda connect antes de fazer join — evita race condition em cold start do Render
        if(_pendingSid){
          const _sid=_pendingSid;
          if(socket&&!socket.connected){
            socket.once('connect',()=>{ setTimeout(()=>joinSession(_sid),100); });
          }else{
            setTimeout(()=>joinSession(_sid),200);
          }
        }else if(window.__mobyaPendingEmergencyId){
          _waitForProviderAccept(window.__mobyaPendingEmergencyId);
        }
        startWatchingLocation();
      }
    });
  }
  async function render(sid){
    const main=document.getElementById('main');if(!main)return;
    main.innerHTML=`<div style="display:flex;flex-direction:column;height:calc(100vh - 60px);gap:0"><div style="padding:14px 16px;background:linear-gradient(135deg,var(--s2),var(--s3));border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px"><div><div id="gpsHeader">📡 GPS TRACKING</div><div id="gpsSessionStatus" style="font-size:.82rem;margin-top:5px"><span style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.76rem">Conectando...</span></div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:150px"><span id="gpsConnectionStatus" style="font-family:'JetBrains Mono',monospace;font-size:.72rem"></span><span id="gpsWatchStatus" style="font-family:'JetBrains Mono',monospace;font-size:.72rem"></span><div style="width:100%"><span id="gpsETA" style="font-family:'JetBrains Mono',monospace;font-size:.78rem"></span><div id="gpsProximityWrap"><div id="gpsProximityFill"></div></div></div></div></div><div id="gpsMapWrap" style="flex:1;min-height:260px;width:100%;position:relative"><div id="gpsMap" style="width:100%;height:100%"></div><div id="navSearchBar" style="position:absolute;top:10px;left:10px;right:10px;z-index:15;display:flex;gap:6px"><input id="navSearchInput" placeholder="Para onde vamos?" style="flex:1;background:rgba(10,10,20,.92);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:.84rem;outline:none;box-shadow:0 4px 14px rgba(0,0,0,.4)" oninput="GPSTracking.searchDestination(this.value)"><button class="ai-btn" id="navStopBtn" style="display:none;padding:10px 14px;background:rgba(239,68,68,.85);color:#fff" onclick="GPSTracking.stopNavigation()">✕</button></div><div id="navSearchResults" style="display:none;position:absolute;top:58px;left:10px;right:10px;z-index:16;background:rgba(10,10,20,.96);border:1px solid var(--border);border-radius:10px;max-height:220px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.5)"></div><div id="navBanner" style="display:none;position:absolute;bottom:12px;left:10px;right:10px;z-index:15;background:linear-gradient(135deg,#0d1424,#15152b);border:1px solid #00d4ff66;border-radius:14px;padding:12px 14px;box-shadow:0 6px 22px rgba(0,212,255,.25);align-items:center;gap:12px"><div id="navManeuverIcon" style="font-size:28px;min-width:36px;text-align:center">⬆️</div><div style="flex:1;min-width:0"><div id="navManeuverText" style="font-size:.86rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Calculando rota...</div><div style="font-size:.72rem;color:var(--muted);margin-top:2px"><span id="navManeuverDist">--</span> · <span id="navDestLabel">Destino</span></div></div><button id="navVoiceBtn" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px" onclick="GPSTracking.toggleNavVoice()">🔊</button></div></div><div id="gpsProviderControls" style="display:none;padding:10px 16px;background:var(--card-bg);border-top:1px solid var(--border)"><div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;font-weight:600">ATUALIZAR STATUS</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="GPSTracking.setStatus('A_CAMINHO')">🚗 A Caminho</button><button class="ai-btn" style="font-size:.75rem;padding:6px 12px;background:rgba(139,92,246,.15);color:#8b5cf6;border:1px solid rgba(139,92,246,.4)" onclick="GPSTracking.promptCheckin()">📸 Check-in (foto)</button><button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="GPSTracking.setStatus('CHEGOU')">📍 Cheguei</button><button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="GPSTracking.setStatus('EM_SERVICO')">🔧 Em Serviço</button><button class="ai-btn" style="font-size:.75rem;padding:6px 12px;background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.4)" onclick="GPSTracking.setStatus('CONCLUIDO')">✅ Concluído</button></div></div><div style="background:var(--card-bg);border-top:1px solid var(--border)"><div id="gpsChatMessages" style="height:110px;overflow-y:auto;padding:8px 14px;display:flex;flex-direction:column"></div><div style="display:flex;gap:8px;padding:8px 14px;border-top:1px solid var(--border)"><input id="gpsChatInput" placeholder="Mensagem rápida..." style="flex:1;background:var(--input-bg,rgba(255,255,255,.06));border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:.84rem;outline:none" onkeydown="if(event.key==='Enter'){GPSTracking.sendChatMessage(this.value);this.value='';}"><button class="ai-btn" style="padding:8px 14px;font-size:.82rem" onclick="const i=document.getElementById('gpsChatInput');GPSTracking.sendChatMessage(i.value);i.value=''">Enviar</button></div></div></div>`;
    _injectStyles();
    updateConnectionStatus('reconectando');
    updateGPSStatus('parado');
    setTimeout(()=>{
      const token=API.getToken();
      if(!token){Toast.show('Faça login para usar o GPS.','warn');return;}
      _pendingToken=token;_pendingSid=sid||null;
      if(typeof mapboxgl==='undefined'){Toast.show('⚠️ Mapbox GL JS não carregado.','error');return;}
      _bootMap();
    },100);
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
  
  let _navSearchTimer=null;
  let _navState={route:null,coords:[],steps:[],stepIdx:0,destMarker:null,watchId:null,voiceOn:true,offRouteHits:0};

  function _haversine(a,b){const R=6371000,toRad=d=>d*Math.PI/180;const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);const sa=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(sa));}
  function _distToRoute(pos,coords){let min=Infinity;for(let i=0;i<coords.length;i++){const d=_haversine(pos,{lat:coords[i][1],lng:coords[i][0]});if(d<min)min=d;}return min;}

  async function _geocodeAddress(q){
    const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&q='+encodeURIComponent(q);
    const r=await fetch(url,{headers:{'Accept-Language':'pt-BR'}});
    if(!r.ok)throw new Error('geocode falhou');
    return r.json();
  }

  async function _calcOSRMRoute(from,to){
    const url=`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true&language=pt`;
    const r=await fetch(url);
    const data=await r.json();
    if(!data.routes||!data.routes.length)throw new Error('sem rota');
    return data.routes[0];
  }

  function _maneuverIcon(type,modifier){
    const m={turn:{left:'⬅️',right:'➡️',straight:'⬆️','slight left':'↖️','slight right':'↗️','sharp left':'↩️','sharp right':'↪️'},
      merge:{left:'↖️',right:'↗️'},roundabout:{default:'🔄'},rotary:{default:'🔄'},arrive:{default:'🏁'},depart:{default:'🚦'},
      fork:{left:'↖️',right:'↗️'},'new name':{default:'⬆️'},continue:{default:'⬆️'},'end of road':{left:'⬅️',right:'➡️'}};
    const g=m[type]||{};
    return g[modifier]||g['default']||'⬆️';
  }

  function _maneuverText(step){
    const type=step.maneuver.type,mod=step.maneuver.modifier,name=step.name||'';
    const dict={'turn-left':'Vire à esquerda','turn-right':'Vire à direita','turn-straight':'Siga em frente',
      'turn-slight left':'Mantenha-se à esquerda','turn-slight right':'Mantenha-se à direita',
      'turn-sharp left':'Vire bruscamente à esquerda','turn-sharp right':'Vire bruscamente à direita',
      'depart-default':'Iniciar rota','arrive-default':'Você chegou ao destino',
      'roundabout-default':'Entre na rotatória','rotary-default':'Entre na rotatória',
      'merge-left':'Convirja à esquerda','merge-right':'Convirja à direita',
      'fork-left':'Mantenha-se à esquerda na bifurcação','fork-right':'Mantenha-se à direita na bifurcação',
      'continue-default':'Continue em frente','new name-default':'Continue em frente',
      'end of road-left':'No fim da via, vire à esquerda','end of road-right':'No fim da via, vire à direita'};
    const key=type+'-'+(mod||'default');
    let txt=dict[key]||dict[type+'-default']||'Siga em frente';
    if(name&&type!=='arrive')txt+=` em ${name}`;
    return txt;
  }

  function _speakNav(text){
    if(!_navState.voiceOn||!('speechSynthesis' in window))return;
    try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=1.0;window.speechSynthesis.speak(u);}catch{}
  }

  function _updManeuverUI(step,dist){
    const icon=document.getElementById('navManeuverIcon'),text=document.getElementById('navManeuverText'),distEl=document.getElementById('navManeuverDist');
    if(icon)icon.textContent=_maneuverIcon(step.maneuver.type,step.maneuver.modifier);
    if(text)text.textContent=_maneuverText(step);
    if(distEl)distEl.textContent=dist>=1000?(dist/1000).toFixed(1)+' km':Math.round(dist)+' m';
  }

  function searchDestination(query){
    clearTimeout(_navSearchTimer);
    const box=document.getElementById('navSearchResults');if(!box)return;
    if(!query||query.trim().length<3){box.innerHTML='';box.style.display='none';return;}
    _navSearchTimer=setTimeout(async()=>{
      box.innerHTML='<div style="padding:8px 12px;color:var(--muted);font-size:.78rem">Buscando...</div>';
      box.style.display='block';
      try{
        const results=await _geocodeAddress(query);
        if(!results.length){box.innerHTML='<div style="padding:8px 12px;color:var(--muted);font-size:.78rem">Nenhum resultado.</div>';return;}
        box.innerHTML=results.map(r=>`<div style="padding:9px 12px;font-size:.8rem;border-bottom:1px solid var(--border);cursor:pointer" onclick='GPSTracking.selectDestination(${r.lat},${r.lon},${JSON.stringify(r.display_name)})'>📍 ${escHtml(r.display_name)}</div>`).join('');
      }catch(e){box.innerHTML='<div style="padding:8px 12px;color:#ef4444;font-size:.78rem">Erro na busca.</div>';}
    },450);
  }

  function selectDestination(lat,lng,label){
    const box=document.getElementById('navSearchResults');if(box){box.innerHTML='';box.style.display='none';}
    const input=document.getElementById('navSearchInput');if(input)input.value=label;
    startNavigation(lat,lng,label);
  }

  async function startNavigation(destLat,destLng,destLabel){
    if(!map){Toast.show('Mapa não carregado.','warn');return;}
    if(!navigator.geolocation){Toast.show('GPS não disponível.','warn');return;}
    const pos=await new Promise(res=>{navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}),()=>res(null),{enableHighAccuracy:true,timeout:8000});});
    if(!pos){Toast.show('Não foi possível obter sua localização.','error');return;}
    Toast.show('🧭 Calculando rota...','info');
    try{
      const route=await _calcOSRMRoute(pos,{lat:destLat,lng:destLng});
      _navState.route=route;_navState.coords=route.geometry.coordinates;_navState.steps=route.legs[0].steps;_navState.stepIdx=0;_navState.offRouteHits=0;
      drawRealRoute(_navState.coords);
      if(_navState.destMarker)_navState.destMarker.remove();
      const el=document.createElement('div');el.style.cssText='font-size:26px';el.textContent='🏁';
      _navState.destMarker=new mapboxgl.Marker({element:el}).setLngLat([destLng,destLat]).addTo(map);
      document.getElementById('navBanner').style.display='flex';
      document.getElementById('navStopBtn').style.display='';
      const lbl=document.getElementById('navDestLabel');if(lbl)lbl.textContent=destLabel||'Destino';
      map.easeTo({center:[pos.lng,pos.lat],zoom:17,pitch:60,duration:800});
      _speakNav('Rota calculada. '+_maneuverText(_navState.steps[0]));
      _updManeuverUI(_navState.steps[0],_navState.steps[0].distance);
      if(_navState.watchId!==null)navigator.geolocation.clearWatch(_navState.watchId);
      _navState.watchId=navigator.geolocation.watchPosition(_onNavPosition,(e)=>console.warn('[Nav]',e.message),{enableHighAccuracy:true,maximumAge:1000,timeout:10000});
      Toast.show('🧭 Navegação iniciada','ok');
    }catch(e){console.warn('[Nav] erro rota',e);Toast.show('Não foi possível calcular a rota.','error');}
  }

  function _onNavPosition(pos){
    if(!map||!_navState.steps.length)return;
    const{latitude:lat,longitude:lng,heading}=pos.coords;
    map.easeTo({center:[lng,lat],bearing:(heading!=null&&!isNaN(heading))?heading:map.getBearing(),duration:500});
    const cur=_navState.steps[_navState.stepIdx];if(!cur)return;
    const mPos={lat:cur.maneuver.location[1],lng:cur.maneuver.location[0]};
    const dist=_haversine({lat,lng},mPos);
    _updManeuverUI(cur,dist);
    if(dist<30){
      _navState.stepIdx++;
      if(_navState.stepIdx>=_navState.steps.length){_speakNav('Você chegou ao seu destino.');Toast.show('🏁 Você chegou ao destino!','ok');stopNavigation();return;}
      const next=_navState.steps[_navState.stepIdx];_speakNav(_maneuverText(next));_updManeuverUI(next,next.distance);
    }
    const offDist=_distToRoute({lat,lng},_navState.coords);
    if(offDist>50){
      _navState.offRouteHits++;
      if(_navState.offRouteHits>=3){
        _navState.offRouteHits=0;Toast.show('↻ Recalculando rota...','warn');
        const dc=_navState.coords[_navState.coords.length-1];
        startNavigation(dc[1],dc[0],document.getElementById('navDestLabel')?.textContent);
      }
    }else{_navState.offRouteHits=0;}
  }

  function stopNavigation(){
    if(_navState.watchId!==null){navigator.geolocation.clearWatch(_navState.watchId);_navState.watchId=null;}
    if(_navState.destMarker){_navState.destMarker.remove();_navState.destMarker=null;}
    _navState.route=null;_navState.coords=[];_navState.steps=[];_navState.stepIdx=0;
    const banner=document.getElementById('navBanner');if(banner)banner.style.display='none';
    const stopBtn=document.getElementById('navStopBtn');if(stopBtn)stopBtn.style.display='none';
    if(map)map.easeTo({pitch:55,duration:600});
    if(window.speechSynthesis)window.speechSynthesis.cancel();
  }

  function toggleNavVoice(){
    _navState.voiceOn=!_navState.voiceOn;
    const btn=document.getElementById('navVoiceBtn');if(btn)btn.textContent=_navState.voiceOn?'🔊':'🔇';
  }

return{render,openTracking,searchDestination,selectDestination,startNavigation,stopNavigation,toggleNavVoice,createSession,joinSession,setStatus,sendChatMessage,startWatchingLocation,stopWatchingLocation,promptCheckin};
})();
