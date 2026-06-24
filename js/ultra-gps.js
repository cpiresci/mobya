// ═══════════════════════════════════════════════════════════════
// ULTRA GPS — rastreamento de sessão + navegação turn-by-turn
// ═══════════════════════════════════════════════════════════════
// Stack: MapLibre GL JS + OpenFreeMap (zero API key) + OSRM público
// + Nominatim para geocoding.
//
// Absorveu o GPS Tracking (gps-tracking.js foi removido).
// Responsabilidades:
//   • Sessão ativa cliente↔prestador (tracking, status, chat, SOS, call)
//   • Navegação Waze-like (busca de destino, turn-by-turn, voz pt-BR,
//     off-route detection, auto-reroute, histórico de destinos)
//   • Modos discover (prestadores próximos) e admin
window.UltraGPS = (() => {
  const API_BASE = (window.MOBYA?.API || 'https://mobya.onrender.com') + '/api/v1';
  const WS_BASE  = API_BASE.replace('/api/v1','').replace('https://','wss://').replace('http://','ws://');

  let socket=null, map=null, markers={}, watchId=null, sessionId=null, myRole=null, chatMsgs=[];
  let sessionProviderId=null, sessionQuoteId=null, _ratingPrompted=false;
  let trailPts=[], _trailIds=[], _initialDistanceKm=null;
  let offlineBuffer=[], pollingTimer=null;
  let _routeSourceId='ultra-route-line', _navTrailSourceId='ultra-nav-trail';
  const OFFLINE_POLL_MS=5000, OFFLINE_POLL_DELAY=10000, BUFFER_KEY='mobya_ultra_buf', TRAIL_MAX=12;
  const HISTORY_KEY='mobya_nav_history', HISTORY_MAX=5;

  // Modo do mapa: tracking | discover | admin
  let mode='tracking';
  let layers={ heat:false, route:true, cluster:true };

  // ── Estilos de tile (MapLibre usa JSON style URL) ──
  const TILE_STYLES=[
    {id:'dark',    label:'Dark',    url:'https://tiles.openfreemap.org/styles/dark'},
    {id:'liberty', label:'Liberty', url:'https://tiles.openfreemap.org/styles/liberty'},
    {id:'bright',  label:'Bright',  url:'https://tiles.openfreemap.org/styles/bright'},
  ];
  let _styleIdx=0;

  const STATUS_LABEL={AGUARDANDO:{text:'Aguardando prestador',color:'#f59e0b',icon:'⏳'},A_CAMINHO:{text:'Prestador a caminho',color:'#3b82f6',icon:'🚗'},CHEGOU:{text:'Prestador chegou!',color:'#8b5cf6',icon:'📍'},EM_SERVICO:{text:'Em atendimento',color:'#f97316',icon:'🔧'},CONCLUIDO:{text:'Serviço concluído',color:'#10b981',icon:'✅'},CANCELADO:{text:'Cancelado',color:'#ef4444',icon:'❌'}};

  // ── Geolocalização ──
  function _getCurrentPosition(timeoutMs=6000){
    return new Promise((resolve)=>{
      if(!navigator.geolocation) return resolve(null);
      const t=setTimeout(()=>resolve(null), timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (pos)=>{ clearTimeout(t); resolve({lat:pos.coords.latitude,lng:pos.coords.longitude}); },
        ()=>{ clearTimeout(t); resolve(null); },
        {enableHighAccuracy:true,maximumAge:5000,timeout:timeoutMs}
      );
    });
  }

  // ── Mapa (MapLibre) ──
  function _markerEl(emoji,role){
    const isP=role==='PROVIDER';
    const div=document.createElement('div');
    div.className=`ultra-marker ${isP?'is-provider':'is-user'}`;
    div.innerHTML=`<div class="ultra-marker-ring"></div><div class="ultra-marker-core">${emoji}</div>`;
    return div;
  }

  async function initMap(id,center){
    if(map){try{map.remove();}catch{}map=null;}
    markers={};trailPts=[];_trailIds=[];
    return new Promise((resolve)=>{
      map=new maplibregl.Map({
        container:id,
        style: TILE_STYLES[_styleIdx].url,
        center: center ? [center.lng,center.lat] : [0,20],
        zoom: center ? 15 : 1.5,
        pitch: 45, bearing: -15, antialias:true,
        attributionControl:false,
      });
      map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
      map.on('load',()=>{ _addHeatmapLayer(); _addClusterLayer(); resolve(map); });
      map.on('moveend',()=>{ _scheduleNearbyRefresh(); });
      map.on('error',(e)=>console.warn('[UltraGPS][MapLibre]',e?.error?.message||e));
    });
  }

  function cycleMapStyle(){
    if(!map)return;
    _styleIdx=(_styleIdx+1)%TILE_STYLES.length;
    map.setStyle(TILE_STYLES[_styleIdx].url);
    // Re-adiciona fontes/layers após troca de estilo
    map.once('style.load',()=>{ _addHeatmapLayer(); _addClusterLayer(); });
    Toast.show(`🗺️ Estilo: ${TILE_STYLES[_styleIdx].label}`,'info');
  }

  // ── Heatmap / Cluster ──
  function _addHeatmapLayer(){
    if(!map)return;
    if(!map.getSource('ultra-heat')) map.addSource('ultra-heat',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    if(!map.getLayer('ultra-heat-layer')){
      map.addLayer({id:'ultra-heat-layer',type:'heatmap',source:'ultra-heat',paint:{
        'heatmap-weight':['interpolate',['linear'],['get','weight'],0,0,1,1],
        'heatmap-intensity':['interpolate',['linear'],['zoom'],11,1,15,3],
        'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(0,255,157,0)',.3,'rgba(0,212,255,.5)',.6,'rgba(124,58,237,.7)',1,'rgba(239,68,68,.9)'],
        'heatmap-radius':['interpolate',['linear'],['zoom'],11,20,15,50],
        'heatmap-opacity':layers.heat?0.8:0,
      }});
    }
  }
  function _addClusterLayer(){
    if(!map)return;
    if(!map.getSource('ultra-providers')) map.addSource('ultra-providers',{type:'geojson',data:{type:'FeatureCollection',features:[]},cluster:true,clusterMaxZoom:14,clusterRadius:50});
    if(!map.getLayer('ultra-clusters')) map.addLayer({id:'ultra-clusters',type:'circle',source:'ultra-providers',filter:['has','point_count'],paint:{'circle-color':['step',['get','point_count'],'#7c3aed',4,'#00d4ff',7,'#00ff9d'],'circle-radius':['step',['get','point_count'],20,4,28,7,36],'circle-opacity':.85,'circle-stroke-width':2,'circle-stroke-color':'rgba(255,255,255,.2)'}});
    if(!map.getLayer('ultra-cluster-count')) map.addLayer({id:'ultra-cluster-count',type:'symbol',source:'ultra-providers',filter:['has','point_count'],layout:{'text-field':'{point_count_abbreviated}','text-size':13},paint:{'text-color':'#fff'}});
    if(!map.getLayer('ultra-unclustered')) map.addLayer({id:'ultra-unclustered',type:'circle',source:'ultra-providers',filter:['!',['has','point_count']],paint:{'circle-color':'#0d1424','circle-radius':16,'circle-stroke-width':2,'circle-stroke-color':'#7c3aed'}});
    if(!map.getLayer('ultra-unclustered-icon')) map.addLayer({id:'ultra-unclustered-icon',type:'symbol',source:'ultra-providers',filter:['!',['has','point_count']],layout:{'text-field':'🔧','text-size':14,'text-allow-overlap':true}});
    ['ultra-clusters','ultra-cluster-count','ultra-unclustered','ultra-unclustered-icon'].forEach(id=>{
      if(map.getLayer(id))map.setLayoutProperty(id,'visibility',layers.cluster?'visible':'none');
    });
  }

  let _nearbyDebounce=null;
  function _scheduleNearbyRefresh(){ if(mode!=='discover')return; clearTimeout(_nearbyDebounce); _nearbyDebounce=setTimeout(()=>_loadNearbyReal(50),600); }

  async function _loadNearbyReal(radiusKm){
    if(!map)return;
    Toast.show('📡 Obtendo sua localização...','info');
    const pos=await new Promise(resolve=>{
      if(!navigator.geolocation)return resolve(null);
      navigator.geolocation.getCurrentPosition(
        p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),
        ()=>resolve(null),
        {enableHighAccuracy:true,timeout:8000,maximumAge:60000}
      );
    });
    if(pos){ map.easeTo({center:[pos.lng,pos.lat],zoom:13,duration:800}); Toast.show('🔍 Prestadores próximos da sua localização','info'); setTimeout(()=>_loadNearbyRealAt(pos,radiusKm),850); return; }
    Toast.show('🔍 Prestadores próximos (usando região padrão)','info');
    _loadNearbyRealAt(null,radiusKm);
  }

  async function _loadNearbyRealAt(pos,radiusKm){
    if(!map)return;
    const center=pos||await _getCurrentPosition();
    if(!pos){ Toast.show('Não foi possível obter sua localização para buscar prestadores.','warn'); return; }
    try{
      const r=await API.emergency.nearby(center.lat,center.lng,{radiusKm:radiusKm||50});
      const list=r?.data||r?.providers||[];
      if(!list.length){ Toast.show('ℹ️ Nenhum prestador encontrado nesse raio.','info'); }
      const features=list.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng??p.longitude,p.lat??p.latitude]},properties:{name:p.name||'Prestador',weight:1}}));
      map.getSource('ultra-providers')?.setData({type:'FeatureCollection',features});
      map.getSource('ultra-heat')?.setData({type:'FeatureCollection',features});
      Toast.show(`📍 ${list.length} prestador(es) carregado(s)`,'ok');
    }catch(e){
      console.warn('[UltraGPS] nearby falhou:',e.message);
      Toast.show('Não foi possível carregar prestadores próximos agora.','warn');
    }
  }

  // ── Trilha do prestador ──
  function _clearTrail(){ if(!map)return; _trailIds.forEach(id=>{ if(map.getLayer(id))map.removeLayer(id); if(map.getSource(id))map.removeSource(id); }); _trailIds=[]; }
  function _pushTrail(lat,lng){
    if(!map)return;
    trailPts.push([lng,lat]); if(trailPts.length>TRAIL_MAX)trailPts.shift();
    _clearTrail(); if(trailPts.length<2)return;
    for(let i=1;i<trailPts.length;i++){
      const t=i/(trailPts.length-1); const id=`ultra-trail-${i}`;
      map.addSource(id,{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[trailPts[i-1],trailPts[i]]}}});
      map.addLayer({id,type:'line',source:id,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#00f5ff','line-width':3,'line-opacity':.06+t*.46}});
      _trailIds.push(id);
    }
  }

  function _pingSignal(role){
    const m=markers[role]; if(!m)return;
    const ring=m.getElement()?.querySelector('.ultra-marker-ring'); if(!ring)return;
    ring.classList.remove('ping'); void ring.offsetWidth; ring.classList.add('ping');
  }
  function _fitBounds(pts){
    if(!map||!pts.length)return;
    if(pts.length===1){map.easeTo({center:pts[0],zoom:16,duration:600});return;}
    const b=pts.reduce((bb,p)=>bb.extend(p),new maplibregl.LngLatBounds(pts[0],pts[0]));
    map.fitBounds(b,{padding:80,maxZoom:16,duration:600});
  }
  function _setRouteLine(coords,{color,width,dash,opacity}={}){
    if(!map||!layers.route)return;
    const id=_routeSourceId;
    const data={type:'Feature',geometry:{type:'LineString',coordinates:coords}};
    if(map.getSource(id)){ map.getSource(id).setData(data); }
    else{ map.addSource(id,{type:'geojson',data}); map.addLayer({id,type:'line',source:id,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':color||'#3b82f6','line-width':width||4,'line-opacity':opacity??.8,...(dash?{'line-dasharray':dash}:{})}}); }
  }
  function updateMarker(role,lat,lng,label){
    if(!map)return;
    const isP=role==='PROVIDER'; const e=isP?'🔧':'📍'; const isNew=!markers[role]; const lngLat=[lng,lat];
    if(markers[role]){ markers[role].setLngLat(lngLat); }
    else{
      const el=_markerEl(e,role);
      markers[role]=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(lngLat)
        .setPopup(new maplibregl.Popup({offset:24,className:'ultra-popup'}).setHTML(`<strong>${label}</strong>`)).addTo(map);
    }
    if(!isNew)_pingSignal(role);
    if(isP)_pushTrail(lat,lng);
    if(markers.USER&&markers.PROVIDER){
      const pts=[markers.USER.getLngLat().toArray(),markers.PROVIDER.getLngLat().toArray()];
      _setRouteLine(pts,{color:'#7c3aed',width:3,dash:[2,1.5],opacity:.6}); _fitBounds(pts);
    } else { map.easeTo({center:lngLat,zoom:16,duration:600}); }
  }
  function drawRealRoute(geometry){ if(!map||!geometry?.length)return; _setRouteLine(geometry,{color:'#3b82f6',width:4,opacity:.8}); }

  // ── Offline buffer ──
  function _loadBuffer(){try{const s=localStorage.getItem(BUFFER_KEY);return s?JSON.parse(s):[];}catch{return[];}}
  function _saveBuffer(buf){try{localStorage.setItem(BUFFER_KEY,JSON.stringify(buf.slice(-50)));}catch{}}
  function _flushBuffer(){
    const buf=[...offlineBuffer,..._loadBuffer()]; offlineBuffer=[];
    try{localStorage.removeItem(BUFFER_KEY);}catch{}
    if(!buf.length)return;
    buf.forEach(p=>{if(socket?.connected)socket.emit('send_location',p);});
  }
  function _startPolling(){
    if(pollingTimer||!sessionId)return;
    pollingTimer=setInterval(async()=>{
      if(socket?.connected){_stopPolling();return;}
      try{ const r=await API.req('GET',`/tracking/sessions/${sessionId}`); if(r?.data)updateSessionStatus(r.data.status); updateConnectionStatus('polling'); }catch{}
    },OFFLINE_POLL_MS);
  }
  function _stopPolling(){ if(pollingTimer){clearInterval(pollingTimer);pollingTimer=null;} }

  // ── Socket ──
  function connectSocket(token){
    if(socket)socket.disconnect();
    socket=io(WS_BASE+'/gps',{auth:{token},transports:['websocket','polling'],reconnectionAttempts:10,reconnectionDelay:2000});
    socket.on('connect',()=>{ _stopPolling(); updateConnectionStatus('online'); setTimeout(_flushBuffer,500); });
    socket.on('disconnect',()=>{ updateConnectionStatus('offline'); setTimeout(()=>{ if(!socket?.connected)_startPolling(); },OFFLINE_POLL_DELAY); });
    socket.on('connect_error',(e)=>{ console.warn('[UltraGPS]',e.message); updateConnectionStatus('reconectando'); });
    socket.on('session_joined',({role,session})=>{
      myRole=role; sessionProviderId=session.providerId||null; sessionQuoteId=session.quoteId||null;
      _flushOwnPosition(); updateSessionStatus(session.status); _updateProviderControls(role);
      addChatMessage({text:`Você entrou como ${role==='USER'?'Cliente':'Prestador'}.`,from:'Sistema',role:'SYSTEM',ts:Date.now()});
    });
    socket.on('location_update',({role,lat,lng,name,eta})=>{
      updateMarker(role,lat,lng,name||role);
      if(eta&&role==='PROVIDER'){ updateETA(eta); if(eta.geometry)drawRealRoute(eta.geometry); }
    });
    socket.on('status_changed',({status})=>{
      updateSessionStatus(status); const s=STATUS_LABEL[status];
      if(s)Toast.show(`${s.icon} ${s.text}`,status==='CONCLUIDO'?'ok':'info');
      if(['CONCLUIDO','CANCELADO'].includes(status))stopWatchingLocation();
      if(status==='CONCLUIDO'&&myRole==='USER'&&!_ratingPrompted){
        _ratingPrompted=true;
        if(typeof RatingModal!=='undefined')setTimeout(()=>RatingModal.prompt(sessionProviderId,sessionId,sessionQuoteId),600);
      }
    });
    socket.on('participant_online',({name})=>addChatMessage({text:`${name} entrou.`,from:'Sistema',role:'SYSTEM',ts:Date.now()}));
    socket.on('participant_offline',({role})=>addChatMessage({text:`${role==='USER'?'Cliente':'Prestador'} saiu.`,from:'Sistema',role:'SYSTEM',ts:Date.now()}));
    socket.on('chat_message',(msg)=>addChatMessage(msg));
    socket.on('error',({code})=>Toast.show(`Erro: ${code}`,'error'));
  }

  function joinSession(sid){ sessionId=sid; trailPts=[]; _initialDistanceKm=null; _clearTrail(); if(!socket?.connected)return; socket.emit('join_session',{sessionId:sid}); }
  let _pendingPos=null;
  function _flushOwnPosition(){ if(_pendingPos&&myRole){ const{lat,lng}=_pendingPos; _pendingPos=null; updateMarker(myRole,lat,lng,'Você'); } }
  function startWatchingLocation(){
    if(!navigator.geolocation){ Toast.show('GPS não disponível.','warn'); return; }
    watchId=navigator.geolocation.watchPosition((pos)=>{
      const{latitude:lat,longitude:lng,heading,speed,accuracy}=pos.coords;
      if(socket?.connected){ socket.emit('send_location',{lat,lng,heading,speed,accuracy}); }
      else{ const ping={lat,lng,heading,speed,accuracy,ts:Date.now()}; offlineBuffer.push(ping); if(offlineBuffer.length>50)offlineBuffer.shift(); _saveBuffer(offlineBuffer); }
      if(myRole){ updateMarker(myRole,lat,lng,'Você'); } else { _pendingPos={lat,lng}; map&&map.easeTo({center:[lng,lat],zoom:16,duration:400}); }
      // alimenta posição para navegação turn-by-turn se ativa
      if(_navState.steps.length)_onNavPosition(pos);
    },(err)=>console.warn('[UltraGPS]',err.message),{enableHighAccuracy:true,maximumAge:3000,timeout:10000});
  }
  function stopWatchingLocation(){ if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;} _stopPolling(); }

  // ── UI status / ETA / conexão ──
  function updateConnectionStatus(s){
    const el=document.getElementById('ultraConn'); if(!el)return;
    const m={online:['🟢 AO VIVO','#00ff9d'],offline:['🔴 OFFLINE','#ef4444'],reconectando:['🟡 RECONECTANDO','#f59e0b'],polling:['🟡 OFFLINE · POLLING','#f59e0b']};
    const[t,c]=m[s]||['',''];
    el.innerHTML=`<span class="ultra-pulse-dot" style="background:${c}"></span><span style="color:${c}">${t}</span>`;
  }
  function updateSessionStatus(status){
    const el=document.getElementById('ultraSessionStatus'); if(!el)return;
    const s=STATUS_LABEL[status]||{text:status,color:'#6b6b90',icon:'•'};
    el.innerHTML=`<span class="ultra-status-chip" style="border-color:${s.color}66;color:${s.color}">${s.icon} ${s.text}</span>`;
  }
  function updateETA({distanceKm,etaMinutes,source}){
    const el=document.getElementById('ultraETA'); if(!el)return;
    if(_initialDistanceKm==null||distanceKm>_initialDistanceKm)_initialDistanceKm=distanceKm;
    const progress=_initialDistanceKm>0?Math.min(1,Math.max(0,1-(distanceKm/_initialDistanceKm))):0;
    const from=[244,63,94],to=[34,216,143]; const mix=from.map((c,i)=>Math.round(c+(to[i]-c)*progress)); const color=`rgb(${mix.join(',')})`;
    const tag=source==='osrm'?'':' ⚠️ estimado';
    el.innerHTML=`<span style="color:${color};font-weight:700">${distanceKm}km</span><span style="color:var(--muted)"> · chega em ~${etaMinutes}min${tag}</span>`;
    const bar=document.getElementById('ultraProximityFill');
    if(bar){bar.style.width=Math.round(progress*100)+'%';bar.style.background=color;bar.style.boxShadow=`0 0 8px ${color}`;}
  }
  function _updateProviderControls(role){ const el=document.getElementById('ultraProviderControls'); if(el)el.style.display=role!=='PROVIDER'?'none':''; }
  function setStatus(status){ if(!socket?.connected||!sessionId)return; socket.emit('update_status',{status}); }
  async function doCheckin(){
    if(!sessionId)return;
    const pos=await _getCurrentPosition(10000);
    if(!pos){ Toast.show('Não foi possível obter sua localização para check-in.','error'); return; }
    const r=await API.req('POST',`/tracking/sessions/${sessionId}/checkin`,{lat:pos.lat,lng:pos.lng,photoUrl:null});
    if(r?.data?.validated)Toast.show('✅ Check-in validado! Pode marcar CHEGOU.','ok');
    else Toast.show(r?.message||'Check-in fora do raio permitido.','warn');
  }

  // ── Chat ──
  function escHtml(t){return String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function addChatMessage({text,from,role,ts}){
    chatMsgs.push({text,from,role,ts});
    const el=document.getElementById('ultraChatMessages'); if(!el)return;
    const isSystem=role==='SYSTEM', isMe=role===myRole;
    const div=document.createElement('div');
    div.style.cssText=`display:flex;flex-direction:column;align-items:${isSystem?'center':isMe?'flex-end':'flex-start'};margin:4px 0`;
    div.innerHTML=isSystem?`<span style="font-size:.72rem;color:var(--muted);padding:2px 8px">${escHtml(text)}</span>`
      :`<div style="max-width:80%;background:${isMe?'var(--q4,#c084fc)':'var(--card-bg,#15152b)'};color:${isMe?'#000':'var(--text,#eee)'};padding:7px 12px;border-radius:${isMe?'12px 12px 2px 12px':'12px 12px 12px 2px'};font-size:.83rem"><div style="font-size:.7rem;color:${isMe?'rgba(0,0,0,.5)':'var(--muted)'};margin-bottom:2px">${escHtml(from)}</div>${escHtml(text)}</div>`;
    el.appendChild(div); el.scrollTop=el.scrollHeight;
  }
  function sendChatMessage(text){ if(!socket?.connected||!text?.trim())return; socket.emit('send_message',{text}); }
  function doChat(){ document.getElementById('ultraChatInput')?.focus(); document.getElementById('ultraChatMessages')?.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  function doCall(){
    if(!socket?.connected){ Toast.show('Conecte-se à sessão para solicitar contato.','warn'); return; }
    sendChatMessage('📞 Solicito contato por telefone — pode me ligar ou informar um número?');
    Toast.show('📞 Pedido de contato enviado pelo chat da sessão.','ok');
  }
  function doSOS(){
    if(!socket?.connected){ Toast.show('Sem conexão — SOS não pôde ser enviado. Tente novamente.','error'); return; }
    sendChatMessage('🚨 SOS — preciso de ajuda urgente agora!');
    const banner=document.getElementById('ultraSosBanner'); if(banner){ banner.classList.add('show'); setTimeout(()=>banner.classList.remove('show'),6000); }
    Toast.show('🚨 SOS enviado para a sessão.','error');
    // alarme full-screen oficial (sirene real, wake lock, vibração contínua)
    try{
      window.SOSAlarm?.show({
        mode:'client-waiting',
        title:'SOS enviado!',
        subtitle: sessionProviderId
          ? 'Aguardando resposta do prestador. Você pode ligar agora.'
          : 'Responda pelo chat da sessão.',
        info: sessionProviderId ? [{label:'Contato', value:'📞 Ligar agora'}] : [],
        onClose: ()=>window.SOSAlarm?.hide()
      });
      setTimeout(()=>window.SOSAlarm?.hide(), 12000);
    }catch(e){}
  }

  // ── Compartilhamento de localização ──
  async function shareLocation(){
    if(!navigator.geolocation){Toast.show('GPS não disponível.','warn');return;}
    navigator.geolocation.getCurrentPosition(async(pos)=>{
      const{latitude:lat,longitude:lng}=pos.coords;
      const url=`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
      const text=`📍 Minha localização (Mobya): ${url}`;
      try{
        if(navigator.share){await navigator.share({title:'Minha localização — Mobya',text,url});}
        else{await navigator.clipboard.writeText(text);Toast.show('📋 Link copiado para a área de transferência.','ok');}
      }catch(e){if(e?.name!=='AbortError'){try{await navigator.clipboard.writeText(text);Toast.show('📋 Link copiado.','ok');}catch{Toast.show('Não foi possível compartilhar.','error');}}}
    },()=>Toast.show('Não foi possível obter sua localização.','error'),{enableHighAccuracy:true,timeout:8000});
  }

  // ── Modo do mapa ──
  function setMode(m){
    mode=m;
    document.querySelectorAll('.ultra-pill').forEach(p=>p.classList.toggle('active',p.dataset.mode===m));
    const trackingEls=document.getElementById('ultraTrackingPanel');
    if(trackingEls)trackingEls.style.display=m==='tracking'?'':'none';
    if(m==='discover'){ _loadNearbyReal(50); layers.cluster=true; _addClusterLayer(); }
    if(m==='admin'){
      const u=window.MobyaAuth?.getUser?.();
      if(!u||!['ADMIN','SUPER_ADMIN'].includes(u.role)){ Toast.show('Acesso restrito a administradores.','warn'); setMode('tracking'); return; }
      _loadNearbyReal(200); layers.heat=true; _addHeatmapLayer();
    }
  }
  function toggleHeat(){ layers.heat=!layers.heat; document.getElementById('ultra-btn-heat')?.classList.toggle('on',layers.heat); if(map?.getLayer('ultra-heat-layer'))map.setPaintProperty('ultra-heat-layer','heatmap-opacity',layers.heat?0.8:0); }
  function toggleRoute(){ layers.route=!layers.route; document.getElementById('ultra-btn-route')?.classList.toggle('on',layers.route); if(map?.getLayer(_routeSourceId))map.setLayoutProperty(_routeSourceId,'visibility',layers.route?'visible':'none'); }
  function toggleCluster(){ layers.cluster=!layers.cluster; document.getElementById('ultra-btn-cluster')?.classList.toggle('on',layers.cluster); ['ultra-clusters','ultra-cluster-count','ultra-unclustered','ultra-unclustered-icon'].forEach(id=>{ if(map?.getLayer(id))map.setLayoutProperty(id,'visibility',layers.cluster?'visible':'none'); }); }

  // ══════════════════════════════════════════════════════════════
  // NAVEGAÇÃO TURN-BY-TURN — OSRM + Nominatim + Web Speech pt-BR
  // ══════════════════════════════════════════════════════════════
  let _navSearchTimer=null;
  let _navState={
    route:null,coords:[],steps:[],stepIdx:0,destMarker:null,navWatchId:null,voiceOn:true,offRouteHits:0,
    destLat:null,destLng:null,destLabel:null,
    preAlerted:new Set(),
    trailPts:[],
    totalDistance:0,totalDuration:0,
  };

  function _haversine(a,b){const R=6371000,toRad=d=>d*Math.PI/180;const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);const sa=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(sa));}
  function _distToRoute(pos,coords){let min=Infinity;for(let i=0;i<coords.length;i++){const d=_haversine(pos,{lat:coords[i][1],lng:coords[i][0]});if(d<min)min=d;}return min;}

  async function _geocodeAddress(q){
    const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&countrycodes=br&q='+encodeURIComponent(q);
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
  function _vibrate(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern);}catch{}}

  function _updManeuverUI(step,dist){
    const icon=document.getElementById('navManeuverIcon'),text=document.getElementById('navManeuverText'),distEl=document.getElementById('navManeuverDist');
    if(icon)icon.textContent=_maneuverIcon(step.maneuver.type,step.maneuver.modifier);
    if(text)text.textContent=_maneuverText(step);
    if(distEl)distEl.textContent=dist>=1000?(dist/1000).toFixed(1)+' km':Math.round(dist)+' m';
    _updLookAhead();
  }
  function _updLookAhead(){
    const el=document.getElementById('navLookAhead');if(!el)return;
    const next=_navState.steps[_navState.stepIdx+1];
    el.textContent=next?`Depois: ${_maneuverIcon(next.maneuver.type,next.maneuver.modifier)} ${_maneuverText(next)}`:'';
  }
  function _estimateSpeedLimit(step){
    const name=(step?.name||'').toLowerCase();
    if(/rodovia|br-\d|km\s?\d|rota\s?\d/.test(name))return 110;
    if(/marginal|via expressa|avenida|av\.|alameda das/.test(name))return 60;
    if(/rua|alameda|travessa|beco/.test(name))return 40;
    return 50;
  }
  function _updSpeedBadge(speedMs){
    const badge=document.getElementById('navSpeedBadge');if(!badge)return;
    const kmh=speedMs!=null&&!isNaN(speedMs)?Math.round(speedMs*3.6):0;
    const cur=_navState.steps[_navState.stepIdx];
    const limit=cur?_estimateSpeedLimit(cur):50;
    const over=kmh>limit+5;
    badge.textContent=`${kmh} km/h · lim. ~${limit}`;
    badge.classList.toggle('over',over);
    if(over)_vibrate(120);
  }
  function _updETABadge(){
    const el=document.getElementById('navETABadge');if(!el||!_navState.totalDistance)return;
    let remainingDist=0;
    for(let i=_navState.stepIdx;i<_navState.steps.length;i++)remainingDist+=_navState.steps[i].distance;
    const ratio=_navState.totalDistance>0?remainingDist/_navState.totalDistance:0;
    const remainingSec=_navState.totalDuration*ratio;
    const arrival=new Date(Date.now()+remainingSec*1000);
    const hh=String(arrival.getHours()).padStart(2,'0'),mm=String(arrival.getMinutes()).padStart(2,'0');
    const mins=Math.max(0,Math.round(remainingSec/60));
    el.textContent=`🏁 ${hh}:${mm} · ${mins}min restantes`;
  }

  // ── Histórico de destinos ──
  function _loadHistory(){try{const s=localStorage.getItem(HISTORY_KEY);return s?JSON.parse(s):[];}catch{return[];}}
  function _saveHistoryEntry(lat,lng,label){
    try{
      let hist=_loadHistory().filter(h=>!(Math.abs(h.lat-lat)<0.0005&&Math.abs(h.lng-lng)<0.0005));
      hist.unshift({lat,lng,label:label||'Destino',ts:Date.now()});
      hist=hist.slice(0,HISTORY_MAX);
      localStorage.setItem(HISTORY_KEY,JSON.stringify(hist));
    }catch{}
  }
  function showHistory(){
    const box=document.getElementById('navSearchResults');if(!box)return;
    const input=document.getElementById('navSearchInput');
    if(input&&input.value.trim().length>=3)return;
    const hist=_loadHistory();
    if(!hist.length){box.style.display='none';return;}
    box.innerHTML=`<div style="padding:7px 12px;color:var(--muted);font-size:.7rem;font-weight:600">DESTINOS RECENTES</div>`+
      hist.map(h=>`<div class="nav-history-item" onclick='UltraGPS.selectDestination(${h.lat},${h.lng},${JSON.stringify(h.label)})'>🕘 <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(h.label)}</span></div>`).join('');
    box.style.display='block';
  }
  function searchDestination(query){
    clearTimeout(_navSearchTimer);
    const box=document.getElementById('navSearchResults');if(!box)return;
    if(!query||query.trim().length<3){showHistory();return;}
    _navSearchTimer=setTimeout(async()=>{
      box.innerHTML='<div style="padding:8px 12px;color:var(--muted);font-size:.78rem">Buscando...</div>';
      box.style.display='block';
      try{
        const results=await _geocodeAddress(query);
        if(!results.length){box.innerHTML='<div style="padding:8px 12px;color:var(--muted);font-size:.78rem">Nenhum resultado.</div>';return;}
        box.innerHTML=results.map(r=>`<div class="nav-history-item" onclick='UltraGPS.selectDestination(${r.lat},${r.lon},${JSON.stringify(r.display_name)})'>📍 <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.display_name)}</span></div>`).join('');
      }catch(e){box.innerHTML='<div style="padding:8px 12px;color:#ef4444;font-size:.78rem">Erro na busca.</div>';}
    },450);
  }
  function selectDestination(lat,lng,label){
    const box=document.getElementById('navSearchResults');if(box){box.innerHTML='';box.style.display='none';}
    const input=document.getElementById('navSearchInput');if(input)input.value=label;
    startNavigation(lat,lng,label);
  }

  // ── Trilha de navegação (MapLibre GeoJSON) ──
  function _pushNavTrail(lat,lng){
    if(!map)return;
    _navState.trailPts.push([lng,lat]);
    if(_navState.trailPts.length>200)_navState.trailPts.shift();
    const data={type:'Feature',geometry:{type:'LineString',coordinates:_navState.trailPts}};
    if(map.getSource(_navTrailSourceId)){ map.getSource(_navTrailSourceId).setData(data); }
    else if(_navState.trailPts.length>=2){
      map.addSource(_navTrailSourceId,{type:'geojson',data});
      map.addLayer({id:_navTrailSourceId,type:'line',source:_navTrailSourceId,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#22d88f','line-width':4,'line-opacity':.75}});
    }
  }
  function _clearNavTrail(){
    if(!map)return;
    if(map.getLayer(_navTrailSourceId))map.removeLayer(_navTrailSourceId);
    if(map.getSource(_navTrailSourceId))map.removeSource(_navTrailSourceId);
    _navState.trailPts=[];
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
      _navState.destLat=destLat;_navState.destLng=destLng;_navState.destLabel=destLabel||'Destino';
      _navState.preAlerted=new Set();
      _navState.totalDistance=route.distance;_navState.totalDuration=route.duration;
      _clearNavTrail();
      drawRealRoute(_navState.coords);
      _saveHistoryEntry(destLat,destLng,destLabel);
      // marcador 🏁 no destino
      if(_navState.destMarker){_navState.destMarker.remove();_navState.destMarker=null;}
      const flagEl=document.createElement('div');flagEl.style.cssText='font-size:26px;line-height:1';flagEl.textContent='🏁';
      _navState.destMarker=new maplibregl.Marker({element:flagEl,anchor:'bottom'}).setLngLat([destLng,destLat]).addTo(map);
      document.getElementById('navBanner').style.display='flex';
      document.getElementById('navStopBtn').style.display='';
      const lbl=document.getElementById('navDestLabel');if(lbl)lbl.textContent=destLabel||'Destino';
      const devBadge=document.getElementById('navDeviationBadge');if(devBadge)devBadge.style.display='none';
      map.easeTo({center:[pos.lng,pos.lat],zoom:17,pitch:50,duration:600});
      _speakNav('Rota calculada. '+_maneuverText(_navState.steps[0]));
      _updManeuverUI(_navState.steps[0],_navState.steps[0].distance);
      _updETABadge();
      _vibrate(80);
      Toast.show('🧭 Navegação iniciada','ok');
    }catch(e){console.warn('[Nav] erro rota',e);Toast.show('Não foi possível calcular a rota.','error');}
  }

  function _onNavPosition(pos){
    if(!map||!_navState.steps.length)return;
    const{latitude:lat,longitude:lng,heading,speed}=pos.coords;
    map.easeTo({center:[lng,lat],zoom:map.getZoom(),duration:200});
    _pushNavTrail(lat,lng);
    const um=markers[myRole];
    if(um&&heading!=null&&!isNaN(heading)){const el=um.getElement();if(el)el.style.setProperty('--heading',heading+'deg');}
    _updSpeedBadge(speed);
    const cur=_navState.steps[_navState.stepIdx];if(!cur)return;
    const mPos={lat:cur.maneuver.location[1],lng:cur.maneuver.location[0]};
    const dist=_haversine({lat,lng},mPos);
    _updManeuverUI(cur,dist);
    _updETABadge();
    if(dist<=200&&!_navState.preAlerted.has(_navState.stepIdx)){
      _navState.preAlerted.add(_navState.stepIdx);
      _speakNav('Em 200 metros, '+_maneuverText(cur).toLowerCase());
      _vibrate([60,40,60]);
    }
    if(dist<30){
      _navState.stepIdx++;
      _vibrate(150);
      if(_navState.stepIdx>=_navState.steps.length){_speakNav('Você chegou ao seu destino.');Toast.show('🏁 Você chegou ao destino!','ok');stopNavigation();return;}
      const next=_navState.steps[_navState.stepIdx];_speakNav(_maneuverText(next));_updManeuverUI(next,next.distance);
    }
    const offDist=_distToRoute({lat,lng},_navState.coords);
    const devBadge=document.getElementById('navDeviationBadge');
    if(offDist>50){
      _navState.offRouteHits++;
      if(devBadge){devBadge.style.display='inline';devBadge.textContent=`↻ desvio detectado (${_navState.offRouteHits}/3)`;}
      if(_navState.offRouteHits>=3){
        _navState.offRouteHits=0;Toast.show('↻ Recalculando rota...','warn');
        if(devBadge)devBadge.style.display='none';
        startNavigation(_navState.destLat,_navState.destLng,_navState.destLabel);
      }
    }else{
      _navState.offRouteHits=0;
      if(devBadge)devBadge.style.display='none';
    }
  }

  function stopNavigation(){
    if(_navState.destMarker){_navState.destMarker.remove();_navState.destMarker=null;}
    _clearNavTrail();
    // remove rota do mapa
    if(map){
      if(map.getLayer(_routeSourceId))map.removeLayer(_routeSourceId);
      if(map.getSource(_routeSourceId))map.removeSource(_routeSourceId);
    }
    _navState.route=null;_navState.coords=[];_navState.steps=[];_navState.stepIdx=0;
    _navState.preAlerted=new Set();_navState.totalDistance=0;_navState.totalDuration=0;
    const banner=document.getElementById('navBanner');if(banner)banner.style.display='none';
    const stopBtn=document.getElementById('navStopBtn');if(stopBtn)stopBtn.style.display='none';
    if(window.speechSynthesis)window.speechSynthesis.cancel();
  }

  function toggleNavVoice(){
    _navState.voiceOn=!_navState.voiceOn;
    const btn=document.getElementById('navVoiceBtn');if(btn)btn.textContent=_navState.voiceOn?'🔊':'🔇';
  }

  // ── Estilos CSS ──
  function _injectStyles(){
    if(document.getElementById('ultra-gps-styles'))return;
    const s=document.createElement('style'); s.id='ultra-gps-styles';
    s.textContent=`
      .ultra-marker{position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center}
      .ultra-marker-core{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;border:2px solid rgba(255,255,255,.9);box-shadow:0 2px 12px rgba(0,0,0,.5);position:relative;z-index:2}
      .ultra-marker.is-provider .ultra-marker-core{background:linear-gradient(135deg,#7c3aed,#00f5ff)}
      .ultra-marker.is-user .ultra-marker-core{background:linear-gradient(135deg,#00f5ff,#fff)}
      .ultra-marker-ring{position:absolute;inset:0;border-radius:50%;pointer-events:none}
      .ultra-marker-ring.ping{animation:ultraPing 1.1s ease-out}
      @keyframes ultraPing{0%{box-shadow:0 0 0 0 rgba(0,245,255,.55)}100%{box-shadow:0 0 0 22px rgba(0,245,255,0)}}
      #ultraHeader{font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:2px;background:linear-gradient(90deg,#c084fc,#00f5ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .ultra-pulse-dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px;animation:ultraBlink 1.4s ease-in-out infinite}
      @keyframes ultraBlink{0%,100%{opacity:1}50%{opacity:.3}}
      .ultra-status-chip{font-family:'JetBrains Mono',monospace;font-size:.74rem;font-weight:600;padding:4px 10px;border-radius:8px;border:1px solid;background:rgba(255,255,255,.04)}
      #ultraProximityWrap{height:5px;border-radius:3px;background:#111122;overflow:hidden;margin-top:6px}
      #ultraProximityFill{height:100%;width:0%;border-radius:3px;transition:width .6s ease,background .6s ease}
      .ultra-pill{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #2a2a45;background:#15152b;color:#9090b0;cursor:pointer;white-space:nowrap}
      .ultra-pill.active{background:#00d4ff;color:#000;border-color:#00d4ff}
      .ultra-layer-btn{width:34px;height:34px;border-radius:10px;background:#15152b;border:1px solid #2a2a45;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;opacity:.5}
      .ultra-layer-btn.on{opacity:1;border-color:#00d4ff}
      #ultraSosBanner{position:absolute;top:0;left:0;right:0;background:#ef4444;color:#fff;text-align:center;font-weight:700;font-size:.8rem;padding:8px;transform:translateY(-100%);transition:transform .3s ease;z-index:40}
      #ultraSosBanner.show{transform:translateY(0)}
      .maplibregl-ctrl-logo,.maplibregl-ctrl-attrib{display:none!important}
      .maplibregl-popup-content{background:#15152b;border:1px solid #2a2a45;color:#eee;border-radius:10px;padding:10px 14px;font-family:inherit}
      .maplibregl-popup-tip{display:none}
      .nav-history-item{padding:9px 14px;cursor:pointer;font-size:.82rem;color:var(--text,#eee);display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .nav-history-item:hover{background:rgba(0,212,255,.08)}
      #navSpeedBadge{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#9090b0;padding:3px 8px;border-radius:6px;border:1px solid #2a2a45}
      #navSpeedBadge.over{color:#ef4444;border-color:#ef4444;animation:navOverspeed .5s ease-in-out infinite alternate}
      @keyframes navOverspeed{from{opacity:1}to{opacity:.5}}
      #navETABadge{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#22d88f}
      #navDeviationBadge{display:none;font-size:.72rem;color:#f59e0b;font-family:'JetBrains Mono',monospace}
      @keyframes ultraSosFlash{0%,100%{background:rgba(239,68,68,.97)}50%{background:rgba(180,20,20,.97)}}
    `;
    document.head.appendChild(s);
  }

  // ── Polling de emergência ──
  function _setWaitingStatus(msg){ const el=document.getElementById('ultraSessionStatus'); if(el)el.innerHTML=`<span style="color:#f59e0b">⏳ ${msg}</span>`; }
  async function _waitForProviderAccept(emergencyId,attempt=0){
    const MAX_ATTEMPTS=20, DELAY_MS=3000;
    _setWaitingStatus('Buscando prestador mais próximo...');
    try{
      const r=await API.req('GET',`/emergency/${emergencyId}/tracking-session`);
      if(r?.data?.sessionId){
        window.__mobyaPendingEmergencyId=null;
        Toast.show('✅ Prestador encontrado! Conectando rastreamento...','ok');
        joinSession(r.data.sessionId);
        return;
      }
    }catch(e){}
    if(attempt>=MAX_ATTEMPTS){ _setWaitingStatus('Nenhum prestador aceitou ainda. Tente novamente em alguns instantes.'); return; }
    setTimeout(()=>_waitForProviderAccept(emergencyId,attempt+1),DELAY_MS);
  }

  // ── Render ──
  async function render(sid){
    const main=document.getElementById('main'); if(!main)return;
    sessionProviderId=null; sessionQuoteId=null; _ratingPrompted=false;
    main.innerHTML=`<div style="display:flex;flex-direction:column;height:calc(100vh - 60px - var(--bnh,0px));position:relative;overflow:hidden">
      <div id="ultraSosBanner">🚨 SOS ATIVO — aguardando resposta</div>
      <div style="flex:none;padding:6px 14px;background:linear-gradient(135deg,var(--s2),var(--s3));border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <div id="ultraHeader">🛣️ ULTRA GPS</div>
          <div id="ultraSessionStatus" style="font-size:.82rem;margin-top:5px"><span style="color:var(--muted);font-family:monospace;font-size:.76rem">Conectando...</span></div>
        </div>
        <div style="display:flex;gap:6px">
          <div class="ultra-pill active" data-mode="tracking" onclick="UltraGPS.setMode('tracking')">📡 Sessão</div>
          <div class="ultra-pill" data-mode="discover" onclick="UltraGPS.setMode('discover')">🔍 Prestadores</div>
          <div class="ultra-pill" data-mode="admin" onclick="UltraGPS.setMode('admin')">📊 Admin</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:140px">
          <span id="ultraConn" style="font-family:monospace;font-size:.72rem"></span>
          <div style="width:100%"><span id="ultraETA" style="font-family:monospace;font-size:.78rem"></span><div id="ultraProximityWrap"><div id="ultraProximityFill"></div></div></div>
        </div>
      </div>
      <div style="flex:1;min-height:0;width:100%;position:relative">
        <div id="ultraMap" style="width:100%;height:100%"></div>
        <!-- Barra de busca de destino sobreposta ao mapa -->
        <div id="navSearchBar" style="position:absolute;top:10px;left:10px;right:10px;z-index:15;display:flex;gap:6px">
          <input id="navSearchInput" placeholder="Para onde vamos?" autocomplete="off"
            style="flex:1;background:rgba(10,10,20,.92);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:.84rem;outline:none;box-shadow:0 4px 14px rgba(0,0,0,.4)"
            oninput="UltraGPS.searchDestination(this.value)" onfocus="UltraGPS.showHistory()">
          <button class="ai-btn" title="Trocar estilo do mapa" style="padding:10px 12px" onclick="UltraGPS.cycleMapStyle()">🗺️</button>
          <button class="ai-btn" title="Compartilhar localização" style="padding:10px 12px" onclick="UltraGPS.shareLocation()">📤</button>
          <button class="ai-btn" id="navStopBtn" style="display:none;padding:10px 14px;background:rgba(239,68,68,.85);color:#fff" onclick="UltraGPS.stopNavigation()">✕</button>
        </div>
        <div id="navSearchResults" style="display:none;position:absolute;top:58px;left:10px;right:10px;z-index:16;background:rgba(10,10,20,.96);border:1px solid var(--border);border-radius:10px;max-height:260px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.5)"></div>
        <!-- Banner de manobra turn-by-turn -->
        <div id="navBanner" style="display:none;position:absolute;bottom:12px;left:10px;right:10px;z-index:15;background:linear-gradient(135deg,#0d1424,#15152b);border:1px solid #00d4ff66;border-radius:14px;padding:12px 14px;box-shadow:0 6px 22px rgba(0,212,255,.25);flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <div id="navManeuverIcon" style="font-size:28px;min-width:36px;text-align:center">⬆️</div>
            <div style="flex:1;min-width:0">
              <div id="navManeuverText" style="font-size:.86rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Calculando rota...</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:2px"><span id="navManeuverDist">--</span> · <span id="navDestLabel">Destino</span></div>
              <div style="font-size:.7rem;color:#22d88f;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="navLookAhead"></div>
            </div>
            <button id="navVoiceBtn" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px" onclick="UltraGPS.toggleNavVoice()">🔊</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:8px"><span id="navSpeedBadge">-- km/h</span><span id="navETABadge"></span></div>
            <span id="navDeviationBadge">↻ desvio detectado</span>
          </div>
        </div>
        <!-- Botões de layer -->
        <div style="position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:6px;z-index:10">
          <div class="ultra-layer-btn" id="ultra-btn-heat" onclick="UltraGPS.toggleHeat()" title="Heatmap">🔥</div>
          <div class="ultra-layer-btn on" id="ultra-btn-route" onclick="UltraGPS.toggleRoute()" title="Rota">🛣️</div>
          <div class="ultra-layer-btn on" id="ultra-btn-cluster" onclick="UltraGPS.toggleCluster()" title="Clusters">📍</div>
        </div>
      </div>
      <div id="ultraTrackingPanel" style="flex:none">
        <div id="ultraProviderControls" style="display:none;padding:6px 14px;background:var(--card-bg);border-top:1px solid var(--border)">
          <div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;font-weight:600">ATUALIZAR STATUS</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="UltraGPS.setStatus('A_CAMINHO')">🚗 A Caminho</button>
            <button class="ai-btn" style="font-size:.75rem;padding:6px 12px;background:rgba(139,92,246,.15);color:#8b5cf6" onclick="UltraGPS.doCheckin()">📸 Check-in</button>
            <button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="UltraGPS.setStatus('CHEGOU')">📍 Cheguei</button>
            <button class="ai-btn" style="font-size:.75rem;padding:6px 12px" onclick="UltraGPS.setStatus('EM_SERVICO')">🔧 Em Serviço</button>
            <button class="ai-btn" style="font-size:.75rem;padding:6px 12px;background:rgba(16,185,129,.15);color:#10b981" onclick="UltraGPS.setStatus('CONCLUIDO')">✅ Concluído</button>
          </div>
        </div>
        <div style="display:flex;gap:6px;padding:6px 14px;background:var(--card-bg);border-top:1px solid var(--border)">
          <button class="ai-btn" style="flex:1" onclick="UltraGPS.doCall()">📞 Contato</button>
          <button class="ai-btn" style="flex:1" onclick="UltraGPS.doChat()">💬 Chat</button>
          <button class="ai-btn" style="flex:1;background:rgba(239,68,68,.18);color:#ef4444;border:1px solid rgba(239,68,68,.4)" onclick="UltraGPS.doSOS()">🚨 SOS</button>
        </div>
        <div style="background:var(--card-bg);border-top:1px solid var(--border)">
          <div id="ultraChatMessages" style="height:70px;overflow-y:auto;padding:6px 14px;display:flex;flex-direction:column"></div>
          <div style="display:flex;gap:6px;padding:6px 14px;border-top:1px solid var(--border)">
            <input id="ultraChatInput" placeholder="Mensagem rápida..." style="flex:1;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:.84rem;outline:none" onkeydown="if(event.key==='Enter'){UltraGPS.sendChatMessage(this.value);this.value='';}">
            <button class="ai-btn" style="padding:8px 14px;font-size:.82rem" onclick="const i=document.getElementById('ultraChatInput');UltraGPS.sendChatMessage(i.value);i.value=''">Enviar</button>
          </div>
        </div>
      </div>
    </div>`;
    _injectStyles();
    updateConnectionStatus('reconectando');

    const token=API.getToken();
    if(!token){ Toast.show('Faça login para usar o Ultra GPS.','warn'); return; }
    if(typeof maplibregl==='undefined'){ Toast.show('⚠️ MapLibre GL JS não carregado.','error'); return; }

    const pos=await _getCurrentPosition();
    if(!pos)Toast.show('ℹ️ Não foi possível obter sua localização — ative o GPS do aparelho.','warn');
    await initMap('ultraMap', pos);
    connectSocket(token);
    if(sid){
      if(socket&&!socket.connected){ socket.once('connect',()=>setTimeout(()=>joinSession(sid),100)); }
      else{ setTimeout(()=>joinSession(sid),200); }
    } else if(window.__mobyaPendingEmergencyId){
      _waitForProviderAccept(window.__mobyaPendingEmergencyId);
    }
    startWatchingLocation();
  }

  async function openTracking(sid){ await render(sid); if(sid)sessionId=sid; }
  async function createSession({quoteId,userId,vertical,address}){ const r=await API.req('POST','/tracking/sessions',{quoteId,userId,vertical,address}); return r.data; }

  return { render, openTracking, createSession, joinSession, setMode,
    toggleHeat, toggleRoute, toggleCluster, cycleMapStyle,
    setStatus, doCheckin, sendChatMessage, doCall, doChat, doSOS,
    startWatchingLocation, stopWatchingLocation,
    searchDestination, selectDestination, startNavigation, stopNavigation,
    toggleNavVoice, shareLocation, showHistory };
})();
