// ═══════════════════════════════════════════════════════════════
// ULTRA GPS — rastreamento de sessão usuário↔prestador (premium)
// ═══════════════════════════════════════════════════════════════
// Substitui o antigo ultra-map/index.html (aba separada, window.open,
// sem auth real, centro de mapa fixo em SP). Agora renderiza DENTRO
// do SPA, no mesmo contexto de window.MobyaAuth/API — exatamente como
// GPSTracking — então a sessão, o token e o socket são 100% reais.
//
// Responsabilidade exclusiva do Ultra GPS: tudo que envolve uma
// SESSÃO ATIVA entre cliente e prestador (tracking, status, chat,
// SOS, chamada). Rotas/Waze de uso diário ficam no GPS Tracking.
window.UltraGPS = (() => {
  const API_BASE = (window.MOBYA?.API || 'https://mobya.onrender.com') + '/api/v1';
  const WS_BASE  = API_BASE.replace('/api/v1','').replace('https://','wss://').replace('http://','ws://');

  let socket=null, map=null, markers={}, watchId=null, sessionId=null, myRole=null, chatMsgs=[];
  let sessionProviderId=null, sessionQuoteId=null, _ratingPrompted=false;
  let trailPts=[], _trailIds=[], _initialDistanceKm=null;
  let offlineBuffer=[], pollingTimer=null;
  const OFFLINE_POLL_MS=5000, OFFLINE_POLL_DELAY=10000, BUFFER_KEY='mobya_ultra_buf', TRAIL_MAX=12;

  // Modo do mapa: tracking (sessão ativa) | discover (prestadores reais perto de mim) | admin (visão ampla, só ADMIN/SUPER_ADMIN)
  let mode='tracking';
  let layers={ threeD:true, heat:false, route:true, cluster:true };

  const STATUS_LABEL={AGUARDANDO:{text:'Aguardando prestador',color:'#f59e0b',icon:'⏳'},A_CAMINHO:{text:'Prestador a caminho',color:'#3b82f6',icon:'🚗'},CHEGOU:{text:'Prestador chegou!',color:'#8b5cf6',icon:'📍'},EM_SERVICO:{text:'Em atendimento',color:'#f97316',icon:'🔧'},CONCLUIDO:{text:'Serviço concluído',color:'#10b981',icon:'✅'},CANCELADO:{text:'Cancelado',color:'#ef4444',icon:'❌'}};

  function getMapboxToken(){ return window.MOBYA?.MAPBOX_TOKEN || null; }

  // ── Geolocalização real (corrige o bug de "está em outra localização") ──
  // Tenta a posição atual do dispositivo; se negar/expirar, cai para a
  // última posição conhecida da sessão (assim que o socket entregar) e,
  // só na ausência total de dados, um zoom-out neutro (sem cidade fixa).
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

  function _markerEl(e,role){
    const isP=role==='PROVIDER';
    const div=document.createElement('div');
    div.className=`ultra-marker ${isP?'is-provider':'is-user'}`;
    div.innerHTML=`<div class="ultra-marker-ring"></div><div class="ultra-marker-core">${e}</div>`;
    return div;
  }

  async function initMap(id,center){
    if(map){try{map.remove();}catch{}map=null;}
    markers={};trailPts=[];_trailIds=[];
    mapboxgl.accessToken=getMapboxToken();
    return new Promise((resolve)=>{
      map=new mapboxgl.Map({
        container:id,
        style:'mapbox://styles/mapbox/dark-v11',
        center: center ? [center.lng,center.lat] : [0,20],
        zoom: center ? 15 : 1.5,
        pitch: 55, bearing: -15, antialias:true,
        attributionControl:false,
      });
      map.addControl(new mapboxgl.NavigationControl({showCompass:false}),'bottom-right');
      map.on('load',()=>{ _apply3DBuildings(); _addHeatmapLayer(); _addClusterLayer(); resolve(map); });
      map.on('error',(e)=>console.warn('[UltraGPS][Mapbox]',e?.error?.message||e));
    });
  }

  function _apply3DBuildings(){
    if(!map||map.getLayer('ultra-3d-buildings'))return;
    map.addLayer({id:'ultra-3d-buildings',source:'composite','source-layer':'building',filter:['==','extrude','true'],type:'fill-extrusion',minzoom:12,
      paint:{'fill-extrusion-color':'#0d1424','fill-extrusion-height':['interpolate',['linear'],['zoom'],12,0,15,['get','height']],'fill-extrusion-base':['interpolate',['linear'],['zoom'],12,0,15,['get','min_height']],'fill-extrusion-opacity':layers.threeD?0.85:0}});
  }

  // ── Heatmap/cluster agora alimentados por dados REAIS de /emergency/nearby ──
  // (o ultra-map antigo usava um array de pontos fixos e um endpoint
  // /providers/nearby que nem existe no backend — corrigido aqui).
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
    [['ultra-clusters','circle'],['ultra-cluster-count','symbol'],['ultra-unclustered','circle'],['ultra-unclustered-icon','symbol']].forEach(([id])=>{
      if(map.getLayer(id))map.setLayoutProperty(id,'visibility',layers.cluster?'visible':'none');
    });
    if(!map.getLayer('ultra-clusters')) map.addLayer({id:'ultra-clusters',type:'circle',source:'ultra-providers',filter:['has','point_count'],paint:{'circle-color':['step',['get','point_count'],'#7c3aed',4,'#00d4ff',7,'#00ff9d'],'circle-radius':['step',['get','point_count'],20,4,28,7,36],'circle-opacity':.85,'circle-stroke-width':2,'circle-stroke-color':'rgba(255,255,255,.2)'}});
    if(!map.getLayer('ultra-cluster-count')) map.addLayer({id:'ultra-cluster-count',type:'symbol',source:'ultra-providers',filter:['has','point_count'],layout:{'text-field':'{point_count_abbreviated}','text-font':['DIN Offc Pro Medium','Arial Unicode MS Bold'],'text-size':13},paint:{'text-color':'#fff'}});
    if(!map.getLayer('ultra-unclustered')) map.addLayer({id:'ultra-unclustered',type:'circle',source:'ultra-providers',filter:['!',['has','point_count']],paint:{'circle-color':'#0d1424','circle-radius':16,'circle-stroke-width':2,'circle-stroke-color':'#7c3aed'}});
    if(!map.getLayer('ultra-unclustered-icon')) map.addLayer({id:'ultra-unclustered-icon',type:'symbol',source:'ultra-providers',filter:['!',['has','point_count']],layout:{'text-field':'🔧','text-size':14,'text-allow-overlap':true}});
  }

  // Busca prestadores reais via API.emergency.nearby (endpoint confirmado no backend).
  async function _loadNearbyReal(radiusKm){
    if(!map)return;
    const pos=await _getCurrentPosition();
    if(!pos){ Toast.show('Não foi possível obter sua localização para buscar prestadores.','warn'); return; }
    try{
      const r=await API.emergency.nearby(pos.lat,pos.lng,{radiusKm:radiusKm||50});
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
    const b=pts.reduce((bb,p)=>bb.extend(p),new mapboxgl.LngLatBounds(pts[0],pts[0]));
    map.fitBounds(b,{padding:80,maxZoom:16,duration:600});
  }
  function _setRouteLine(coords,{color,width,dash,opacity}={}){
    if(!map||!layers.route)return;
    const id='ultra-route-line';
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
      markers[role]=new mapboxgl.Marker({element:el,anchor:'center'}).setLngLat(lngLat)
        .setPopup(new mapboxgl.Popup({offset:24,className:'ultra-popup'}).setHTML(`<strong>${label}</strong>`)).addTo(map);
    }
    if(!isNew)_pingSignal(role);
    if(isP)_pushTrail(lat,lng);
    if(markers.USER&&markers.PROVIDER){
      const pts=[markers.USER.getLngLat().toArray(),markers.PROVIDER.getLngLat().toArray()];
      _setRouteLine(pts,{color:'#7c3aed',width:3,dash:[2,1.5],opacity:.6}); _fitBounds(pts);
    } else { map.easeTo({center:lngLat,zoom:16,duration:600}); }
  }
  function drawRealRoute(geometry){ if(!map||!geometry?.length)return; _setRouteLine(geometry,{color:'#3b82f6',width:4,opacity:.8}); }

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

  // ── Socket real — auth via API.getToken() (mesmo módulo do SPA, em memória/cookie) ──
  // Corrige o bug crítico: antes (ultra-map em aba nova) o token nunca
  // estava acessível porque vivia em memória/cookie httpOnly, não em localStorage.
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
    },(err)=>console.warn('[UltraGPS]',err.message),{enableHighAccuracy:true,maximumAge:3000,timeout:10000});
  }
  function stopWatchingLocation(){ if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;} _stopPolling(); }

  // ── UI: status, ETA, conexão, controles do prestador ──
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

  // ── Chat real, embutido (antes o ultra-map tentava "voltar ao SPA" — agora é nativo aqui) ──
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

  // ── Ações do painel inferior — agora reais, não placeholders ──
  function doChat(){ document.getElementById('ultraChatInput')?.focus(); document.getElementById('ultraChatMessages')?.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  function doCall(){
    // TODO backend: não existe campo de telefone na sessão (loadSession só
    // retorna IDs). Para "ligar" de verdade com segurança/privacidade, o
    // backend precisa de uma rota de relay (ex.: número mascarado/Twilio)
    // ou notificação push "solicitar contato". Por ora, fazemos o melhor
    // possível: pede contato pelo chat da própria sessão, de forma real.
    if(!socket?.connected){ Toast.show('Conecte-se à sessão para solicitar contato.','warn'); return; }
    sendChatMessage('📞 Solicito contato por telefone — pode me ligar ou informar um número?');
    Toast.show('📞 Pedido de contato enviado pelo chat da sessão.','ok');
  }
  function doSOS(){
    if(!socket?.connected){ Toast.show('Sem conexão — SOS não pôde ser enviado. Tente novamente.','error'); return; }
    sendChatMessage('🚨 SOS — preciso de ajuda urgente agora!');
    const banner=document.getElementById('ultraSosBanner'); if(banner){ banner.classList.add('show'); setTimeout(()=>banner.classList.remove('show'),6000); }
    Toast.show('🚨 SOS enviado para a sessão.','error');
    // TODO backend: hoje o SOS vira mensagem de chat. Para prioridade real
    // (push ao admin/central, log de incidente), criar evento dedicado
    // 'sos' no namespace /gps + endpoint de auditoria.
  }

  // ── Modo do mapa (pills) ──
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
  function toggle3D(){ layers.threeD=!layers.threeD; document.getElementById('ultra-btn-3d')?.classList.toggle('on',layers.threeD); if(map){ map.easeTo({pitch:layers.threeD?55:0,duration:500}); if(map.getLayer('ultra-3d-buildings'))map.setPaintProperty('ultra-3d-buildings','fill-extrusion-opacity',layers.threeD?0.85:0); } }
  function toggleHeat(){ layers.heat=!layers.heat; document.getElementById('ultra-btn-heat')?.classList.toggle('on',layers.heat); if(map?.getLayer('ultra-heat-layer'))map.setPaintProperty('ultra-heat-layer','heatmap-opacity',layers.heat?0.8:0); }
  function toggleRoute(){ layers.route=!layers.route; document.getElementById('ultra-btn-route')?.classList.toggle('on',layers.route); if(map?.getLayer('ultra-route-line'))map.setLayoutProperty('ultra-route-line','visibility',layers.route?'visible':'none'); }
  function toggleCluster(){ layers.cluster=!layers.cluster; document.getElementById('ultra-btn-cluster')?.classList.toggle('on',layers.cluster); ['ultra-clusters','ultra-cluster-count','ultra-unclustered','ultra-unclustered-icon'].forEach(id=>{ if(map?.getLayer(id))map.setLayoutProperty(id,'visibility',layers.cluster?'visible':'none'); }); }

  // ── Estilos quantum premium (injetados, mesmo padrão do GPSTracking) ──
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
      .mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}
      .mapboxgl-popup-content{background:#15152b;border:1px solid #2a2a45;color:#eee;border-radius:10px;padding:10px 14px;font-family:inherit}
      .mapboxgl-popup-tip{display:none}
    `;
    document.head.appendChild(s);
  }

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
    }catch(e){ /* ainda não aceitou — segue tentando */ }
    if(attempt>=MAX_ATTEMPTS){ _setWaitingStatus('Nenhum prestador aceitou ainda. Tente novamente em alguns instantes.'); return; }
    setTimeout(()=>_waitForProviderAccept(emergencyId,attempt+1),DELAY_MS);
  }

  // ── Entrada principal — renderiza DENTRO do SPA (não abre aba nova) ──
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
        <div style="position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:6px;z-index:10">
          <div class="ultra-layer-btn on" id="ultra-btn-3d" onclick="UltraGPS.toggle3D()" title="3D">🏙️</div>
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
    if(typeof mapboxgl==='undefined'){ Toast.show('⚠️ Mapbox GL JS não carregado.','error'); return; }

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

  return { render, openTracking, setMode, toggle3D, toggleHeat, toggleRoute, toggleCluster,
    setStatus, doCheckin, sendChatMessage, doCall, doChat, doSOS, startWatchingLocation, stopWatchingLocation };
})();
