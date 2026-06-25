window.RentalHost = (() => {
  const BSM = {
    PENDING:   { label:'Aguardando', color:'var(--gold)',  bg:'rgba(251,191,36,.12)', border:'rgba(251,191,36,.3)',   icon:'\u23f3' },
    CONFIRMED: { label:'Confirmado', color:'var(--neon)',  bg:'rgba(0,245,255,.10)',  border:'rgba(0,245,255,.3)',    icon:'\u2705' },
    ACTIVE:    { label:'Em curso',   color:'var(--green)', bg:'rgba(16,185,129,.10)', border:'rgba(16,185,129,.3)',   icon:'\U0001f697' },
    COMPLETED: { label:'Conclu\u00eddo',  color:'var(--muted)', bg:'rgba(100,116,139,.1)', border:'rgba(100,116,139,.3)', icon:'\U0001f3c1' },
    CANCELLED: { label:'Cancelado',  color:'var(--red)',   bg:'rgba(239,68,68,.10)',  border:'rgba(239,68,68,.3)',   icon:'\u2716\ufe0f' },
    DECLINED:  { label:'Recusado',   color:'var(--red)',   bg:'rgba(239,68,68,.10)',  border:'rgba(239,68,68,.3)',   icon:'\U0001f6ab' },
    DISPUTED:  { label:'Disputa',    color:'#f97316',      bg:'rgba(249,115,22,.10)', border:'rgba(249,115,22,.3)',  icon:'\u26a0\ufe0f' },
  };

  const esc   = t => String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtD  = iso => { if(!iso)return'\u2014'; const d=new Date(iso); return d.toLocaleDateString('pt-BR'); };
  const fmtBRL= v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const badge = s => { const m=BSM[s]||{label:s,color:'var(--muted)',bg:'rgba(0,0,0,.2)',border:'rgba(255,255,255,.1)',icon:'\u2022'}; return `<span style="font-family:'JetBrains Mono',monospace;font-size:.63rem;padding:3px 9px;border-radius:4px;background:${m.bg};color:${m.color};border:1px solid ${m.border}">${m.icon} ${m.label}</span>`; };

  let _tab = 'bookings';

  function setLoading(id,msg='&#x27f3; Carregando...'){const el=document.getElementById(id);if(el)el.innerHTML=`<div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;text-align:center;padding:40px">${msg}</div>`;}
  function setError(id,msg){const el=document.getElementById(id);if(el)el.innerHTML=`<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:20px;text-align:center"><div style="font-size:1.4rem;margin-bottom:8px">\u26a0\ufe0f</div><div style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:.78rem">${esc(msg)}</div></div>`;}

  function bookingCard(b){
    const sm=BSM[b.status]||{};
    const renter=b.renter||{};
    const listing=(b.config||{}).listing||{};
    const isPaid=b.renterPaymentStatus==='COMPLETED';
    const canConfirm=b.status==='PENDING';
    const canDecline=b.status==='PENDING';
    const canCheckin=b.status==='CONFIRMED'&&isPaid;
    const canCheckout=b.status==='ACTIVE';
    const canCancel=b.status==='ACTIVE';
    return `<div id="hbcard-${esc(b.id)}" style="background:var(--s2);border:1px solid ${sm.border||'var(--border)'};border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:10px;transition:border-color .2s" onmouseover="this.style.borderColor='rgba(0,245,255,.25)'" onmouseout="this.style.borderColor='${sm.border||'var(--border)'}'">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.3rem">\U0001f3e0</span><div><div style="font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:2px;color:var(--neon)">RESERVA #${esc(b.id.slice(-6).toUpperCase())}</div><div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${fmtD(b.createdAt)}</div></div></div>
        <div style="display:flex;align-items:center;gap:6px">${isPaid?`<span style="font-family:'JetBrains Mono',monospace;font-size:.6rem;padding:2px 8px;border-radius:4px;background:rgba(16,185,129,.12);color:var(--green);border:1px solid rgba(16,185,129,.3)">\U0001f4b0 PAGO</span>`:''} ${badge(b.status)}</div>
      </div>
      ${listing.title?`<div style="background:var(--s3);border-radius:7px;padding:8px 11px;font-size:.78rem;color:var(--text)">\U0001f697 <strong>${esc(listing.title)}</strong>${listing.city?` \u2014 ${esc(listing.city)}`:''}</div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">RETIRADA</div><div style="font-family:'JetBrains Mono',monospace">${fmtD(b.startDate)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">DEVOLU\u00c7\u00c3O</div><div style="font-family:'JetBrains Mono',monospace">${fmtD(b.endDate)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">DI\u00c1RIAS</div><div style="font-family:'JetBrains Mono',monospace;color:var(--neon)">${b.days||'?'}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">SEU REPASSE</div><div style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${fmtBRL(b.hostPayoutAmount)}</div></div>
      </div>
      ${renter.name?`<div style="background:var(--s3);border-radius:7px;padding:9px 12px;display:flex;align-items:center;gap:9px"><span style="font-size:1rem">\U0001f464</span><div><div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:1px">LOCAT\u00c1RIO</div><div style="font-size:.82rem;color:var(--text);font-weight:600">${esc(renter.name)}</div>${renter.phone?`<div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${esc(renter.phone)}</div>`:''}</div></div>`:''}
      ${b.status==='PENDING'?`<div style="font-size:.72rem;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:6px;padding:8px 11px;color:var(--gold);font-family:'JetBrains Mono',monospace">\u23f3 Aguardando sua decis\u00e3o. Confirme ou recuse esta reserva.</div>`:''}
      ${b.status==='CONFIRMED'&&!isPaid?`<div style="font-size:.72rem;background:rgba(0,245,255,.07);border:1px solid rgba(0,245,255,.2);border-radius:6px;padding:8px 11px;color:var(--neon);font-family:'JetBrains Mono',monospace">\u231b Reserva confirmada \u2014 aguardando pagamento do locat\u00e1rio.</div>`:''}
      ${b.status==='CONFIRMED'&&isPaid?`<div style="font-size:.72rem;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);border-radius:6px;padding:8px 11px;color:var(--green);font-family:'JetBrains Mono',monospace">\u2705 Pago! Realize o check-in quando o locat\u00e1rio retirar o ve\u00edculo.</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${canConfirm?`<button onclick="RentalHost.confirmBooking('${esc(b.id)}')" style="flex:1;min-width:120px;background:linear-gradient(135deg,var(--green),#059669);color:#fff;border:none;border-radius:8px;padding:9px;font-weight:700;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">\u2705 Confirmar</button>`:''}
        ${canDecline?`<button onclick="RentalHost.declineBooking('${esc(b.id)}')" style="flex:1;min-width:100px;background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:9px;font-weight:600;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">\u2716 Recusar</button>`:''}
        ${canCheckin?`<button onclick="RentalHost.checkinBooking('${esc(b.id)}')" style="flex:1;min-width:120px;background:linear-gradient(135deg,var(--neon),#0891b2);color:#000;border:none;border-radius:8px;padding:9px;font-weight:700;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">\U0001f697 Check-in</button>`:''}
        ${canCheckout?`<button onclick="RentalHost.checkoutBooking('${esc(b.id)}')" style="flex:1;min-width:120px;background:linear-gradient(135deg,var(--gold),#d97706);color:#000;border:none;border-radius:8px;padding:9px;font-weight:700;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">\U0001f3c1 Check-out</button>`:''}
        ${canCancel?`<button onclick="RentalHost.cancelBooking('${esc(b.id)}')" style="flex:1;min-width:100px;background:rgba(239,68,68,.08);color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:8px;font-weight:600;font-size:.74rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">\u26a0\ufe0f Cancelar</button>`:''}
      </div>
    </div>`;
  }

  function configCard(cfg){
    const listing=cfg.listing||{};
    const fr=v=>v!=null?fmtBRL(v):'\u2014';
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.2rem">\U0001f697</span><div><div style="font-family:'Bebas Neue',sans-serif;font-size:.9rem;letter-spacing:2px;color:var(--neon)">${esc(listing.title||'Ve\u00edculo')}</div>${listing.city?`<div style="font-size:.67rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${esc(listing.city)}${listing.state?', '+esc(listing.state):''}</div>`:''}</div></div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:.63rem;padding:2px 9px;border-radius:4px;background:${cfg.active?'rgba(16,185,129,.12)':'rgba(239,68,68,.1)'};color:${cfg.active?'var(--green)':'var(--red)'};border:1px solid ${cfg.active?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}">${cfg.active?'\u25cf ATIVO':'\u25cf INATIVO'}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">
        <div style="font-size:.7rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">DI\u00c1RIA</div><div style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${fr(cfg.dailyRate)}</div></div>
        <div style="font-size:.7rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">SEMANAL</div><div style="font-family:'JetBrains Mono',monospace">${fr(cfg.weeklyRate)}</div></div>
        <div style="font-size:.7rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">MENSAL</div><div style="font-family:'JetBrains Mono',monospace">${fr(cfg.monthlyRate)}</div></div>
        <div style="font-size:.7rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">PLANO</div><div style="font-family:'JetBrains Mono',monospace">${esc(cfg.protectionPlan||'STANDARD')}</div></div>
        <div style="font-size:.7rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">IMEDIATA</div><div style="font-family:'JetBrains Mono',monospace">${cfg.instantBook?'SIM':'N\u00c3O'}</div></div>
        <div style="font-size:.7rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">KM/DIA</div><div style="font-family:'JetBrains Mono',monospace">${cfg.includedKmPerDay||0}</div></div>
      </div>
      <button onclick="RentalHost.toggleConfig('${esc(cfg.id)}',${cfg.active})" style="background:${cfg.active?'rgba(239,68,68,.1)':'rgba(16,185,129,.1)'};color:${cfg.active?'var(--red)':'var(--green)'};border:1px solid ${cfg.active?'rgba(239,68,68,.3)':'rgba(16,185,129,.3)'};border-radius:8px;padding:8px;font-weight:600;font-size:.75rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">${cfg.active?'\u23f8 Pausar':'\u25b6 Ativar'}</button>
    </div>`;
  }

  function tabBar(){
    return `<div style="display:flex;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:20px">
      <button onclick="RentalHost._switchTab('bookings')" style="flex:1;padding:10px;background:${_tab==='bookings'?'rgba(0,245,255,.12)':'transparent'};color:${_tab==='bookings'?'var(--neon)':'var(--muted)'};border:none;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer;border-right:1px solid var(--border)">\U0001f4cb Reservas</button>
      <button onclick="RentalHost._switchTab('configs')" style="flex:1;padding:10px;background:${_tab==='configs'?'rgba(16,185,129,.12)':'transparent'};color:${_tab==='configs'?'var(--green)':'var(--muted)'};border:none;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer">\U0001f697 Meus Ve\u00edculos</button>
    </div>`;
  }

  function _shell(content){
    return `<div style="margin-bottom:24px"><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:4px;background:linear-gradient(135deg,#fff,var(--green),var(--neon));-webkit-background-clip:text;-webkit-text-fill-color:transparent">PAINEL DO ANFITRI\u00c3O</div><div style="color:var(--muted);font-size:.84rem;margin-top:4px">Gerencie suas reservas e ve\u00edculos cadastrados</div></div>${tabBar()}<div id="rh-content"></div>`;
  }

  async function render(){
    if(!API.isAuth()){window.App?.toast('Fa\u00e7a login para acessar o painel.','warn');window.MobyaAuth?.showLogin();return;}
    const main=document.getElementById('main');if(!main)return;
    main.innerHTML=_shell();
    _loadTab();
  }

  function _currentTab(){return _tab;}
  function _switchTab(tab){
    _tab=tab;
    const main=document.getElementById('main');if(!main)return;
    main.innerHTML=_shell();
    _loadTab();
  }

  async function _loadTab(){if(_tab==='bookings')await _loadBookings();else await _loadConfigs();}

  async function _loadBookings(){
    setLoading('rh-content');
    try{
      const r=await API.rental.hostBookings({limit:50});
      const list=r?.data?.bookings||r?.data||[];
      const el=document.getElementById('rh-content');if(!el)return;
      if(!list.length){el.innerHTML=`<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">\U0001f3e0</div><div style="font-family:'JetBrains Mono',monospace;font-size:.78rem;margin-bottom:16px">Nenhuma reserva recebida ainda.</div><button onclick="RentalHost._switchTab('configs')" style="background:linear-gradient(135deg,var(--green),#059669);color:#fff;border:none;border-radius:8px;padding:10px 22px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">\U0001f697 Cadastrar ve\u00edculo</button></div>`;return;}
      const order=['PENDING','CONFIRMED','ACTIVE','COMPLETED','DISPUTED','CANCELLED','DECLINED'];
      const _ix=s=>{const i=order.indexOf(s);return i===-1?99:i;};
      list.sort((a,b)=>_ix(a.status)-_ix(b.status));
      el.innerHTML=`<div style="display:flex;flex-direction:column;gap:14px">${list.map(bookingCard).join('')}</div>`;
    }catch(e){setError('rh-content',e?.message||'Erro ao carregar reservas');}
  }

  async function _loadConfigs(){
    setLoading('rh-content');
    try{
      const r=await API.rental.myConfigs({limit:50});
      const list=r?.data?.configs||r?.data||[];
      const el=document.getElementById('rh-content');if(!el)return;
      if(!list.length){el.innerHTML=`<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">\U0001f697</div><div style="font-family:'JetBrains Mono',monospace;font-size:.78rem;margin-bottom:16px">Nenhum ve\u00edculo cadastrado para aluguel.</div><button onclick="App.navigate('garagem')" style="background:linear-gradient(135deg,var(--neon),#0891b2);color:#000;border:none;border-radius:8px;padding:10px 22px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">\U0001f3ce\ufe0f Minha Garagem</button></div>`;return;}
      el.innerHTML=`<div style="display:flex;flex-direction:column;gap:14px">${list.map(configCard).join('')}</div>`;
    }catch(e){setError('rh-content',e?.message||'Erro ao carregar ve\u00edculos');}
  }

  async function _bookingAction(id,action,opts={}){
    const card=document.getElementById(`hbcard-${id}`);
    const btns=card?.querySelectorAll('button');
    btns?.forEach(b=>{b.disabled=true;b.style.opacity='.5';});
    try{
      if(action==='confirm')  {await API.rental.confirmBooking(id);App.toast('\u2705 Reserva confirmada!','ok');}
      else if(action==='decline') {await API.rental.declineBooking(id,opts);App.toast('Reserva recusada.','ok');}
      else if(action==='checkin') {await API.rental.checkinBooking(id);App.toast('\U0001f697 Check-in realizado!','ok');}
      else if(action==='checkout'){await API.rental.checkoutBooking(id);App.toast('\U0001f3c1 Check-out conclu\u00eddo!','ok');}
      else if(action==='cancel')  {await API.rental.cancelPaidBooking(id,opts);App.toast('Cancelamento registrado.','ok');}
      await _loadBookings();
    }catch(e){
      App.toast(e?.message||'Erro ao processar a\u00e7\u00e3o.','err');
      btns?.forEach(b=>{b.disabled=false;b.style.opacity='1';});
    }
  }

  async function confirmBooking(id){if(!window.confirm('Confirmar esta reserva?'))return;await _bookingAction(id,'confirm');}
  async function declineBooking(id){const r=window.prompt('Motivo da recusa (opcional):');if(r===null)return;await _bookingAction(id,'decline',{reason:r||undefined});}
  async function checkinBooking(id){if(!window.confirm('Realizar check-in? Confirme que o locat\u00e1rio j\u00e1 retirou o ve\u00edculo.'))return;await _bookingAction(id,'checkin');}
  async function checkoutBooking(id){if(!window.confirm('Realizar check-out? Confirme que o ve\u00edculo foi devolvido.'))return;await _bookingAction(id,'checkout');}
  async function cancelBooking(id){if(!window.confirm('Cancelar esta reserva ativa?\n\nO locat\u00e1rio receber\u00e1 reembolso integral.'))return;await _bookingAction(id,'cancel',{reason:'Cancelado pelo anfitri\u00e3o.'});}

  async function toggleConfig(id,currentActive){
    try{
      await API.rental.updateConfig(id,{active:!currentActive});
      App.toast(currentActive?'\u23f8 Ve\u00edculo pausado.':'\u25b6 Ve\u00edculo ativado.','ok');
      await _loadConfigs();
    }catch(e){App.toast(e?.message||'Erro ao atualizar ve\u00edculo.','err');}
  }

  return{render,_switchTab,_currentTab,confirmBooking,declineBooking,checkinBooking,checkoutBooking,cancelBooking,toggleConfig};
})();
