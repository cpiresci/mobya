#!/usr/bin/env python3
"""
Patch: SOS real no Ultra GPS — substitui o SOS-via-chat por evento
dedicado 'sos' (consome o backend sos_alert), com alarme sonoro +
overlay full-screen + telefone do par pra ligação direta (tel:).
"""
path = '/data/data/com.termux/files/home/mobya-master/js/ultra-gps.js'

with open(path, 'r') as f:
    content = f.read()

edits = []

# 1) Listener do sos_alert junto dos outros socket.on
old1 = """    socket.on('chat_message',(msg)=>addChatMessage(msg));
    socket.on('error',({code})=>Toast.show(`Erro: ${code}`,'error'));
  }
"""
new1 = """    socket.on('chat_message',(msg)=>addChatMessage(msg));
    socket.on('sos_alert',(alert)=>_triggerSosAlarm(alert));
    socket.on('error',({code})=>Toast.show(`Erro: ${code}`,'error'));
  }
"""
edits.append(('listener sos_alert', old1, new1))

# 2) doSOS(): emite evento real além da mensagem de chat
old2 = """  function doSOS(){
    if(!socket?.connected){ Toast.show('Sem conexão — SOS não pôde ser enviado. Tente novamente.','error'); return; }
    sendChatMessage('🚨 SOS — preciso de ajuda urgente agora!');
    const banner=document.getElementById('ultraSosBanner'); if(banner){ banner.classList.add('show'); setTimeout(()=>banner.classList.remove('show'),6000); }
    Toast.show('🚨 SOS enviado para a sessão.','error');
    // TODO backend: hoje o SOS vira mensagem de chat. Para prioridade real
    // (push ao admin/central, log de incidente), criar evento dedicado
    // 'sos' no namespace /gps + endpoint de auditoria.
  }
"""
new2 = """  function doSOS(){
    if(!socket?.connected){ Toast.show('Sem conexão — SOS não pôde ser enviado. Tente novamente.','error'); return; }
    sendChatMessage('🚨 SOS — preciso de ajuda urgente agora!');
    socket.emit('sos');
    const banner=document.getElementById('ultraSosBanner'); if(banner){ banner.classList.add('show'); setTimeout(()=>banner.classList.remove('show'),6000); }
    Toast.show('🚨 SOS enviado — o outro lado vai receber alarme sonoro e seu contato.','error');
  }

  // ── Alarme SOS recebido: overlay full-screen + som + ligação direta ──
  let _sosAudioCtx=null, _sosBeepTimer=null;
  function _playSosBeep(){
    try{
      if(!_sosAudioCtx)_sosAudioCtx=new (window.AudioContext||window.webkitAudioContext)();
      const ctx=_sosAudioCtx, osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type='square'; osc.frequency.value=880;
      gain.gain.setValueAtTime(0.0001,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.35,ctx.currentTime+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime+0.4);
    }catch(e){ console.warn('[UltraGPS] SOS beep falhou:',e.message); }
  }
  function _triggerSosAlarm(alert){
    if(navigator.vibrate)navigator.vibrate([400,200,400,200,400]);
    clearInterval(_sosBeepTimer);
    _playSosBeep(); _sosBeepTimer=setInterval(_playSosBeep,700);
    setTimeout(()=>clearInterval(_sosBeepTimer),15000);

    let ov=document.getElementById('ultraSosOverlay');
    if(!ov){
      ov=document.createElement('div'); ov.id='ultraSosOverlay';
      document.getElementById('ultraMapWrap')?.appendChild(ov) || document.body.appendChild(ov);
    }
    const who=alert.fromRole==='USER'?'Cliente':'Prestador';
    const phoneLink=alert.fromPhone?`<a href="tel:${alert.fromPhone}" style="display:inline-block;margin-top:10px;background:#fff;color:#ef4444;font-weight:800;padding:10px 22px;border-radius:30px;text-decoration:none">📞 Ligar agora para ${alert.fromName}</a>`:`<div style="margin-top:10px;font-size:.8rem;opacity:.85">Sem telefone cadastrado — responda pelo chat da sessão.</div>`;
    ov.innerHTML=`<div style="font-size:2.2rem">🚨</div><div style="font-weight:800;font-size:1.05rem;margin-top:6px">SOS — ${who} ${alert.fromName} precisa de ajuda</div>${phoneLink}<button id="ultraSosDismiss" style="display:block;margin:16px auto 0;background:transparent;border:1px solid #fff;color:#fff;padding:6px 18px;border-radius:20px;font-size:.78rem">Ciente — fechar alarme</button>`;
    ov.classList.add('show');
    document.getElementById('ultraSosDismiss').onclick=()=>{ ov.classList.remove('show'); clearInterval(_sosBeepTimer); };

    const banner=document.getElementById('ultraSosBanner'); if(banner){ banner.classList.add('show'); setTimeout(()=>banner.classList.remove('show'),6000); }
    addChatMessage({text:`🚨 SOS recebido de ${alert.fromName}.`,from:'Sistema',role:'SYSTEM',ts:alert.ts||Date.now()});
  }
"""
edits.append(('doSOS + alarme', old2, new2))

# 3) CSS do overlay full-screen
old3 = """      #ultraSosBanner{position:absolute;top:0;left:0;right:0;background:#ef4444;color:#fff;text-align:center;font-weight:700;font-size:.8rem;padding:8px;transform:translateY(-100%);transition:transform .3s ease;z-index:40}
      #ultraSosBanner.show{transform:translateY(0)}
"""
new3 = """      #ultraSosBanner{position:absolute;top:0;left:0;right:0;background:#ef4444;color:#fff;text-align:center;font-weight:700;font-size:.8rem;padding:8px;transform:translateY(-100%);transition:transform .3s ease;z-index:40}
      #ultraSosBanner.show{transform:translateY(0)}
      #ultraSosOverlay{position:absolute;inset:0;background:rgba(239,68,68,.97);color:#fff;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;z-index:60;animation:ultraSosFlash 1s infinite}
      #ultraSosOverlay.show{display:flex}
      @keyframes ultraSosFlash{0%,100%{background:rgba(239,68,68,.97)}50%{background:rgba(180,20,20,.97)}}
"""
edits.append(('css overlay', old3, new3))

for name, old, new in edits:
    if old not in content:
        print(f'ERRO: trecho não encontrado ({name}) — abortando sem gravar.')
        exit(1)
    content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print('OK: SOS real com alarme sonoro + telefone direto aplicado em ultra-gps.js')
