window.RentalGuest = (() => {
  const SM={PENDING:{label:'Aguardando',color:'var(--gold)',bg:'rgba(251,191,36,.12)',border:'rgba(251,191,36,.3)',icon:'⏳'},CONFIRMED:{label:'Confirmado',color:'var(--neon)',bg:'rgba(0,245,255,.10)',border:'rgba(0,245,255,.3)',icon:'✅'},ACTIVE:{label:'Em curso',color:'var(--green)',bg:'rgba(16,185,129,.10)',border:'rgba(16,185,129,.3)',icon:'🚗'},COMPLETED:{label:'Concluído',color:'var(--muted)',bg:'rgba(100,116,139,.1)',border:'rgba(100,116,139,.3)',icon:'🏁'},CANCELLED:{label:'Cancelado',color:'var(--red)',bg:'rgba(239,68,68,.10)',border:'rgba(239,68,68,.3)',icon:'✖️'},DECLINED:{label:'Recusado',color:'var(--red)',bg:'rgba(239,68,68,.10)',border:'rgba(239,68,68,.3)',icon:'🚫'},DISPUTED:{label:'Disputa',color:'#f97316',bg:'rgba(249,115,22,.10)',border:'rgba(249,115,22,.3)',icon:'⚠️'}};
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtD=iso=>{if(!iso)return'—';const d=new Date(iso);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});};
  const fmtBRL=v=>`R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const badge=s=>{const m=SM[s]||{label:s,color:'var(--muted)',bg:'rgba(0,0,0,.2)',border:'rgba(255,255,255,.1)',icon:'•'};return`<span style="font-family:'JetBrains Mono',monospace;font-size:.63rem;padding:3px 9px;border-radius:4px;background:${m.bg};color:${m.color};border:1px solid ${m.border}">${m.icon} ${m.label}</span>`;};

  // Geolocalização best-effort (não trava o fluxo se o usuário negar) — mesmo padrão de js/monetization.js
  function _getCoords(){
    return new Promise((resolve)=>{
      if(!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos)=>resolve({lat:pos.coords.latitude,lng:pos.coords.longitude}),
        ()=>resolve({}),
        {timeout:6000,enableHighAccuracy:true}
      );
    });
  }

  // Captura uma foto via câmera do dispositivo e devolve um data URL JPEG comprimido
  // (sem storage externo configurado: a foto é persistida como base64 LONGTEXT no MySQL).
  function _capturePhoto(){
    return new Promise((resolve,reject)=>{
      const input=document.createElement('input');
      input.type='file';input.accept='image/*';input.capture='environment';
      input.onchange=()=>{
        const file=input.files&&input.files[0];
        if(!file) return reject(new Error('Nenhuma foto selecionada.'));
        const img=new Image();
        const reader=new FileReader();
        reader.onload=()=>{img.onload=()=>{
          const maxW=900;
          const scale=Math.min(1,maxW/img.width);
          const canvas=document.createElement('canvas');
          canvas.width=img.width*scale;canvas.height=img.height*scale;
          canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',0.7));
        };img.onerror=()=>reject(new Error('Falha ao processar a foto.'));img.src=reader.result;};
        reader.onerror=()=>reject(new Error('Falha ao ler a foto.'));
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  function bookingCard(b){
    const sm=SM[b.status]||{};
    const host=b.host||{};
    const canCancel=b.status==='PENDING'||(b.status==='CONFIRMED'&&!['COMPLETED','PROCESSING'].includes(b.renterPaymentStatus));
    const canCancelPaid=b.status==='ACTIVE';
    const canPay=b.status==='CONFIRMED'&&b.renterPaymentStatus!=='COMPLETED';
    // Locatário confirma checkin: anfitrião registrou, pagamento feito, ainda em CONFIRMED
    const canCheckinConfirm=b.status==='CONFIRMED'&&b.renterPaymentStatus==='COMPLETED'&&!!b.checkinInitiatedAt;
    const canCheckoutInitiate=b.status==='ACTIVE'&&!b.checkoutInitiatedAt;
    const checkoutWaitingHost=b.status==='ACTIVE'&&!!b.checkoutInitiatedAt;
    return`<div id="gbcard-${esc(b.id)}" style="background:var(--s2);border:1px solid ${sm.border||'var(--border)'};border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:10px;transition:border-color .2s" onmouseover="this.style.borderColor='rgba(0,245,255,.25)'" onmouseout="this.style.borderColor='${sm.border||'var(--border)'}'">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.3rem">🗝️</span><div><div style="font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:2px;color:var(--neon)">RESERVA #${esc(b.id.slice(-6).toUpperCase())}</div><div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${fmtD(b.createdAt)}</div></div></div>
        ${badge(b.status)}
      </div>
      ${b.status==='PENDING'?`<div style="font-size:.72rem;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:6px;padding:8px 11px;color:var(--gold);font-family:'JetBrains Mono',monospace">⏳ Aguardando confirmação do anfitrião. Você receberá uma notificação.</div>`:''}
      ${b.status==='CONFIRMED'&&!b.checkinInitiatedAt?`<div style="font-size:.72rem;background:rgba(0,245,255,.07);border:1px solid rgba(0,245,255,.2);border-radius:6px;padding:8px 11px;color:var(--neon);font-family:'JetBrains Mono',monospace">✅ Reserva confirmada! Dirija-se ao local na data do check-in.</div>`:''}
      ${b.status==='CONFIRMED'&&b.checkinInitiatedAt&&b.renterPaymentStatus==='COMPLETED'?`<div style="font-size:.72rem;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:6px;padding:8px 11px;color:var(--green);font-family:'JetBrains Mono',monospace">🚗 O anfitrião registrou a entrega. Confirme a retirada para iniciar a locação.</div>`:''}
      ${b.status==='DECLINED'?`<div style="font-size:.72rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:6px;padding:8px 11px;color:var(--red);font-family:'JetBrains Mono',monospace">🚫 Recusado pelo anfitrião.${b.declineReason?' Motivo: '+esc(b.declineReason):''}</div>`:''}
      ${checkoutWaitingHost?`<div style="font-size:.72rem;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:6px;padding:8px 11px;color:var(--gold);font-family:'JetBrains Mono',monospace">⏳ Devolução registrada! Aguardando o anfitrião confirmar o check-out.</div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">RETIRADA</div><div style="font-family:'JetBrains Mono',monospace">${fmtD(b.startDate)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">DEVOLUÇÃO</div><div style="font-family:'JetBrains Mono',monospace">${fmtD(b.endDate)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">DIÁRIAS</div><div style="font-family:'JetBrains Mono',monospace;color:var(--neon)">${b.days||'?'}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">TOTAL</div><div style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${fmtBRL(b.renterTotalAmount)}</div></div>
      </div>
      ${host.name?`<div style="background:var(--s3);border-radius:7px;padding:9px 12px;display:flex;align-items:center;gap:9px"><span style="font-size:1rem">🏠</span><div><div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:1px">ANFITRIÃO</div><div style="font-size:.82rem;color:var(--text);font-weight:600">${esc(host.name)}</div>${host.phone?`<div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${esc(host.phone)}</div>`:''}</div></div>`:''}
      ${canPay?`<button onclick="RentalGuest.pay('${esc(b.id)}')" style="width:100%;background:linear-gradient(135deg,var(--green),#059669);color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Space Grotesk',sans-serif;margin-top:2px">💳 Pagar agora — ${fmtBRL(b.renterTotalAmount)}</button>`:''}
      ${canCheckinConfirm?`<button onclick="RentalGuest.checkinConfirm('${esc(b.id)}')" style="width:100%;background:linear-gradient(135deg,var(--neon),#0891b2);color:#000;border:none;border-radius:8px;padding:10px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Space Grotesk',sans-serif;margin-top:2px">🚗 Confirmar Retirada do Veículo</button>`:''}
      ${canCheckoutInitiate?`<button onclick="RentalGuest.checkoutInitiate('${esc(b.id)}')" style="width:100%;background:linear-gradient(135deg,var(--gold),#d97706);color:#000;border:none;border-radius:8px;padding:10px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Space Grotesk',sans-serif;margin-top:2px">🏁 Finalizar Locação</button>`:''}
      ${canCancel?`<button onclick="RentalGuest.cancel('${esc(b.id)}','${esc(b.status)}')" style="width:100%;background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:9px;font-weight:600;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif;margin-top:2px">✖ Cancelar Reserva</button>`:''}
      ${canCancelPaid?`<button onclick="RentalGuest.cancel('${esc(b.id)}','${esc(b.status)}')" style="width:100%;background:rgba(239,68,68,.08);color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:9px;font-weight:600;font-size:.76rem;cursor:pointer;font-family:'Space Grotesk',sans-serif;margin-top:2px">✖ Cancelar e Solicitar Reembolso</button>`:''}
    </div>`;
  }

  function _handleMpReturn() {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    if (!payment) return;
    history.replaceState(null, '', location.pathname + location.hash.split('?')[0]);
    if (payment === 'success') App.toast('✅ Pagamento aprovado! Reserva ativada.', 'ok', 5000);
    else if (payment === 'pending') App.toast('⏳ Pagamento em análise. Aguarde.', 'warn', 5000);
    else if (payment === 'failure') App.toast('❌ Pagamento não concluído. Tente novamente.', 'err', 5000);
  }

  async function render(){
    _handleMpReturn();
    if(!API.isAuth()){window.App?.toast('Faça login para ver suas reservas.','warn');window.MobyaAuth?.showLogin();return;}
    const main=document.getElementById('main');if(!main)return;
    main.innerHTML=`<div style="margin-bottom:24px"><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:4px;background:linear-gradient(135deg,#fff,var(--neon),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent">MINHAS RESERVAS</div><div style="color:var(--muted);font-size:.84rem;margin-top:4px">Histórico e status das suas locações</div><div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap"><span style="font-size:.72rem;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);border-radius:6px;padding:5px 10px;color:var(--green);font-family:'JetBrains Mono',monospace">✅ Reservas protegidas por escrow</span><span style="font-size:.72rem;background:rgba(0,245,255,.08);border:1px solid rgba(0,245,255,.2);border-radius:6px;padding:5px 10px;color:var(--neon);font-family:'JetBrains Mono',monospace">⚡ Cancelamento gratuito até 24h</span></div></div>
    <div id="rg-list"><div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;text-align:center;padding:40px">⟳ Carregando...</div></div>`;
    try{
      const r=await API.rental.myBookings({limit:50});
      const list=r?.data?.bookings||r?.data||[];
      const el=document.getElementById('rg-list');if(!el)return;
      if(!list.length){el.innerHTML=`<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">🗝️</div><div style="font-family:'JetBrains Mono',monospace;font-size:.78rem;margin-bottom:16px">Você ainda não tem reservas.</div><button onclick="App.navigate('aluguel')" style="background:linear-gradient(135deg,var(--green),#059669);color:#fff;border:none;border-radius:8px;padding:10px 22px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">🔍 Buscar veículos</button></div>`;return;}
      el.innerHTML=`<div style="display:flex;flex-direction:column;gap:14px">${list.map(bookingCard).join('')}</div>`;
    }catch(e){const el=document.getElementById('rg-list');if(el)el.innerHTML=`<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:24px;text-align:center"><div style="font-size:1.5rem;margin-bottom:8px">⚠️</div><div style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:.8rem">${e?.message||'Erro ao carregar reservas'}</div><button onclick="RentalGuest.render()" style="margin-top:16px;background:var(--s2);border:1px solid var(--border);color:var(--neon);border-radius:8px;padding:8px 18px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:.72rem">↺ Tentar novamente</button></div>`;}
    _startPoll();
  }

  async function cancel(id, status){
    const isActive = status === 'ACTIVE';
    const confirmMsg = isActive
      ? 'Cancelar esta reserva em curso?\n\nSe você cancelar com 24h+ de antecedência do check-in, o reembolso é automático. Fora desse prazo, a solicitação vai para revisão do admin.'
      : 'Cancelar esta reserva?';
    if(!window.confirm(confirmMsg))return;
    const card=document.getElementById('gbcard-'+id);
    const btns=card?.querySelectorAll('button');
    const btn=btns&&btns.length?btns[btns.length-1]:null;
    if(btn){btn.disabled=true;btn.style.opacity='.5';}
    try{
      if(isActive){
        await API.rental.cancelPaidBooking(id,{reason:'Cancelamento solicitado pelo locatário'});
        window.App?.toast('Cancelamento registrado. Reembolso processado conforme a política.','ok');
      } else {
        await API.rental.cancelBooking(id,{reason:'Cancelado pelo locatário'});
        window.App?.toast('Reserva cancelada.','ok');
      }
      await render();
    }catch(e){
      window.App?.toast(e?.message||'Erro ao cancelar.','err');
      if(btn){btn.disabled=false;btn.style.opacity='1';}
    }
  }

  async function pay(bookingId) {
    const card = document.getElementById('gbcard-'+bookingId);
    const btn = card?.querySelector('button');
    if (btn) { btn.disabled = true; btn.style.opacity = '.6'; btn.textContent = '⟳ Iniciando pagamento...'; }
    try {
      const r = await API.rental.payBooking(bookingId);
      const url = r.data?.sandboxInitPoint || r.data?.initPoint;
      if (url) { window.location.href = url; return; }
      App.toast('Erro ao iniciar pagamento', 'err');
    } catch(e) {
      App.toast(e.message || 'Erro no pagamento', 'err');
    }
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = '💳 Pagar agora'; }
  }
  async function checkinConfirm(bookingId){
    if(!window.confirm('Confirmar que você retirou o veículo?\n\nVamos pedir uma foto do veículo e sua localização como comprovante. Isso inicia oficialmente a locação.'))return;
    const card=document.getElementById('gbcard-'+bookingId);
    const btn=card?.querySelector('button[onclick*="checkinConfirm"]');
    try{
      if(btn){btn.disabled=true;btn.style.opacity='.6';btn.textContent='📷 Aguardando foto...';}
      const photoUrl=await _capturePhoto();
      if(btn)btn.textContent='⟳ Confirmando...';
      const {lat,lng}=await _getCoords();
      await API.rental.checkinConfirmBooking(bookingId,{lat,lng,photoUrl});
      window.App?.toast('🚗 Check-in confirmado! Locação em andamento.','ok');
      await render();
    }catch(e){
      window.App?.toast(e?.message||'Erro ao confirmar check-in.','err');
      if(btn){btn.disabled=false;btn.style.opacity='1';btn.textContent='🚗 Confirmar Retirada do Veículo';}
    }
  }

  async function checkoutInitiate(bookingId){
    if(!window.confirm('Finalizar a locação?\n\nVamos pedir uma foto do veículo e sua localização atual como comprovante da devolução.'))return;
    const card=document.getElementById('gbcard-'+bookingId);
    const btn=card?.querySelector('button[onclick*="checkoutInitiate"]');
    try{
      if(btn){btn.disabled=true;btn.style.opacity='.6';btn.textContent='📷 Aguardando foto...';}
      const photoUrl=await _capturePhoto();
      if(btn)btn.textContent='⟳ Registrando...';
      const {lat,lng}=await _getCoords();
      await API.rental.checkoutInitiateBooking(bookingId,{lat,lng,photoUrl});
      window.App?.toast('📍 Devolução registrada! Aguardando confirmação do anfitrião.','ok');
      await render();
    }catch(e){
      window.App?.toast(e?.message||'Erro ao registrar devolução.','err');
      if(btn){btn.disabled=false;btn.style.opacity='1';btn.textContent='🏁 Finalizar Locação';}
    }
  }

  let _pollTimer=null;
  function _startPoll(){_stopPoll();_pollTimer=setInterval(()=>{if(document.getElementById('rg-list'))render();else _stopPoll();},30000);}
  function _stopPoll(){if(_pollTimer){clearInterval(_pollTimer);_pollTimer=null;}}

  return{render,cancel,pay,cancelPaid:(id)=>cancel(id,'ACTIVE'),checkinConfirm,checkoutInitiate};
})();
