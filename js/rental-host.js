window.RentalHost = (() => {
  const STATUS_META = {
    PENDING:   {label:'Pendente',  color:'var(--gold)', bg:'rgba(251,191,36,.12)',border:'rgba(251,191,36,.3)', icon:'⏳'},
    CONFIRMED: {label:'Confirmado',color:'var(--neon)', bg:'rgba(0,245,255,.10)', border:'rgba(0,245,255,.3)',  icon:'✅'},
    ACTIVE:    {label:'Em curso',  color:'var(--green)',bg:'rgba(16,185,129,.10)',border:'rgba(16,185,129,.3)', icon:'🚗'},
    COMPLETED: {label:'Concluído', color:'var(--muted)',bg:'rgba(100,116,139,.1)',border:'rgba(100,116,139,.3)',icon:'🏁'},
    CANCELLED: {label:'Cancelado', color:'var(--red)',  bg:'rgba(239,68,68,.10)', border:'rgba(239,68,68,.3)',  icon:'✖️'},
    DECLINED:  {label:'Recusado',  color:'var(--red)',  bg:'rgba(239,68,68,.10)', border:'rgba(239,68,68,.3)',  icon:'🚫'},
  };
  const TABS=[['PENDING','⏳ Pendentes'],['CONFIRMED','✅ Confirmadas'],['ACTIVE','🚗 Em curso'],['COMPLETED','🏁 Concluídas'],['CANCELLED','✖️ Canceladas']];
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtD=iso=>{if(!iso)return'—';const d=new Date(iso);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});};
  const fmtBRL=v=>`R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const badge=s=>{const m=STATUS_META[s]||{label:s,color:'var(--muted)',bg:'rgba(0,0,0,.2)',border:'rgba(255,255,255,.1)',icon:'•'};return`<span style="font-family:'JetBrains Mono',monospace;font-size:.63rem;padding:3px 9px;border-radius:4px;background:${m.bg};color:${m.color};border:1px solid ${m.border}">${m.icon} ${m.label}</span>`;};
  let _bookings={};

  function bookingCard(b){
    const sm=STATUS_META[b.status]||{};
    const r=b.renter||{};
    // Campos corretos do schema RentalBooking:
    //   dias          → b.days
    //   total locatário → b.renterTotalAmount
    //   repasse anfitrião → b.hostPayoutAmount
    //   taxa Mobya    → b.hostFeeAmount
    const canC=b.status==='PENDING',canD=b.status==='PENDING',canI=b.status==='CONFIRMED',canO=b.status==='ACTIVE';
    const listing=b.config?.listing||{};
    const listingTitle=listing.title||'Veículo';
    return`<div id="hbcard-${esc(b.id)}" style="background:var(--s2);border:1px solid ${sm.border||'var(--border)'};border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px;transition:border-color .2s" onmouseover="this.style.borderColor='rgba(0,245,255,.25)'" onmouseout="this.style.borderColor='${sm.border||'var(--border)'}'">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:9px"><span style="font-size:1.4rem">🗝️</span><div><div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:2px;color:var(--neon)">${esc(listingTitle).slice(0,30)}</div><div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;color:var(--muted)">RESERVA #${esc(b.id.slice(-6).toUpperCase())} · ${fmtD(b.createdAt)}</div></div></div>
        ${badge(b.status)}
      </div>
      <div style="background:var(--s3);border-radius:8px;padding:10px 13px;display:flex;align-items:center;gap:10px"><span style="font-size:1.1rem">👤</span><div><div style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:2px">LOCATÁRIO</div><div style="font-size:.86rem;color:var(--text);font-weight:600">${esc(r.name||'—')}</div>${r.phone?`<div style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${esc(r.phone)}</div>`:''}</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">CHECK-IN</div><div style="font-family:'JetBrains Mono',monospace">${fmtD(b.startDate)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">CHECK-OUT</div><div style="font-family:'JetBrains Mono',monospace">${fmtD(b.endDate)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">DIÁRIAS</div><div style="font-family:'JetBrains Mono',monospace;color:var(--neon)">${b.days??'?'}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">TOTAL LOCATÁRIO</div><div style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${fmtBRL(b.renterTotalAmount)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">SEU REPASSE</div><div style="font-family:'JetBrains Mono',monospace;color:var(--green)">${fmtBRL(b.hostPayoutAmount)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">TAXA MOBYA</div><div style="font-family:'JetBrains Mono',monospace">${fmtBRL(b.hostFeeAmount)}</div></div>
      </div>
      ${b.cancelReason?`<div style="font-size:.78rem;color:var(--muted);background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:7px;padding:9px 12px;line-height:1.5"><span style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:.65rem">📝 MOTIVO</span><br>${esc(b.cancelReason)}</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
        ${canC?`<button onclick="RentalHost.confirm('${esc(b.id)}')" style="flex:1;background:linear-gradient(135deg,var(--green),#059669);color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700;font-size:.8rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">✅ Confirmar</button><button onclick="RentalHost.decline('${esc(b.id)}')" style="flex:1;background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px;font-weight:600;font-size:.8rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">✖ Recusar</button>`:''}
        ${canI?`<button onclick="RentalHost.checkin('${esc(b.id)}')" style="flex:1;background:linear-gradient(135deg,var(--neon),#0077b6);color:#000;border:none;border-radius:8px;padding:10px;font-weight:700;font-size:.8rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">🚗 Registrar Check-in</button>`:''}
        ${canO?`<button onclick="RentalHost.checkout('${esc(b.id)}')" style="flex:1;background:linear-gradient(135deg,var(--gold),#d97706);color:#000;border:none;border-radius:8px;padding:10px;font-weight:700;font-size:.8rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">🏁 Registrar Devolução</button>`:''}
        ${!canC&&!canD&&!canI&&!canO?`<div style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;padding:6px 0">Nenhuma ação disponível.</div>`:''}
      </div>
    </div>`;
  }

  function renderList(tab){
    TABS.forEach(([t])=>{const b=document.getElementById('rhtab-'+t);if(!b)return;const on=t===tab;b.style.background=on?'var(--s2)':'transparent';b.style.color=on?'var(--neon)':'var(--muted)';b.style.borderBottom=on?'2px solid var(--neon)':'2px solid transparent';});
    const content=document.getElementById('rh-content');if(!content)return;
    const list=_bookings[tab]||[];
    if(!list.length){const msg={PENDING:['📭','Nenhuma aguardando confirmação.'],CONFIRMED:['✅','Nenhuma confirmada.'],ACTIVE:['🚗','Nenhuma em curso.'],COMPLETED:['🏁','Nenhuma concluída.'],CANCELLED:['✖️','Nenhuma cancelada.']}[tab]||['📋','Nenhum resultado.'];content.innerHTML=`<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">${msg[0]}</div><div style="font-family:'JetBrains Mono',monospace;font-size:.78rem">${msg[1]}</div></div>`;return;}
    content.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">${list.map(bookingCard).join('')}</div>`;
  }

  async function render(){
    if(!API.isAuth()){window.App?.toast('Faça login para acessar o painel.','warn');window.MobyaAuth?.showLogin();return;}
    const mainEl=document.getElementById('main');if(!mainEl)return;
    mainEl.innerHTML=`<div style="margin-bottom:28px"><div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;background:linear-gradient(135deg,#fff,var(--neon),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent">PAINEL DO ANFITRIÃO</div><div style="color:var(--muted);font-size:.84rem;margin-top:4px">Gerencie as reservas do seu veículo · Confirme · Check-in/out</div></div>
    <div id="rh-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:28px">${Array(4).fill(0).map((_,i)=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px;animation:pulse 2s ${i*.15}s infinite"><div style="height:9px;background:var(--s3);border-radius:4px;width:55%;margin-bottom:10px"></div><div style="height:24px;background:var(--s3);border-radius:4px;width:70%"></div></div>`).join('')}</div>
    <div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border);overflow-x:auto">${TABS.map(([t,l],i)=>`<button id="rhtab-${t}" onclick="RentalHost.switchTab('${t}')" style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.76rem;padding:9px 16px;border:none;cursor:pointer;border-radius:8px 8px 0 0;transition:all .15s;white-space:nowrap;background:${i===0?'var(--s2)':'transparent'};color:${i===0?'var(--neon)':'var(--muted)'};border-bottom:${i===0?'2px solid var(--neon)':'2px solid transparent'}">${l}</button>`).join('')}</div>
    <div id="rh-content"><div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;text-align:center;padding:40px">⟳ Carregando...</div></div>`;
    try{
      const [rP,rC,rA,rCo,rCa]=await Promise.all([
        API.rental.hostBookings({status:'PENDING',limit:50}),
        API.rental.hostBookings({status:'CONFIRMED',limit:50}),
        API.rental.hostBookings({status:'ACTIVE',limit:50}),
        API.rental.hostBookings({status:'COMPLETED',limit:50}),
        API.rental.hostBookings({status:'CANCELLED',limit:50}),
      ]);
      const get=r=>r?.data?.data||r?.data?.bookings||r?.data||[];
      _bookings={PENDING:get(rP),CONFIRMED:get(rC),ACTIVE:get(rA),COMPLETED:get(rCo),CANCELLED:get(rCa)};
      // KPIs — usa campos corretos do schema
      const totalRecv=_bookings.COMPLETED.reduce((s,b)=>s+(b.hostPayoutAmount||0),0);
      const pendRecv=[..._bookings.CONFIRMED,..._bookings.ACTIVE].reduce((s,b)=>s+(b.hostPayoutAmount||0),0);
      const kpiEl=document.getElementById('rh-kpis');
      if(kpiEl)kpiEl.innerHTML=[
        {label:'AGUARDANDO',value:String(_bookings.PENDING.length),color:'var(--gold)',icon:'⏳'},
        {label:'EM CURSO',value:String(_bookings.ACTIVE.length),color:'var(--neon)',icon:'🚗'},
        {label:'A RECEBER',value:fmtBRL(pendRecv),color:'var(--green)',icon:'💸'},
        {label:'RECEBIDO',value:fmtBRL(totalRecv),color:'var(--q3)',icon:'💰'},
      ].map(k=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px"><div style="font-size:1.3rem;margin-bottom:8px">${k.icon}</div><div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);letter-spacing:1px;margin-bottom:6px">${k.label}</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:${k.color}">${k.value}</div></div>`).join('');
      renderList('PENDING');
    }catch(e){const c=document.getElementById('rh-content');if(c)c.innerHTML=`<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:24px;text-align:center"><div style="font-size:1.5rem;margin-bottom:8px">⚠️</div><div style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:.8rem">${e?.message||'Erro ao carregar'}</div><button onclick="RentalHost.render()" style="margin-top:16px;background:var(--s2);border:1px solid var(--border);color:var(--neon);border-radius:8px;padding:8px 18px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:.72rem">↺ Tentar novamente</button></div>`;}
  }

  async function _action(id,fn,errMsg,okMsg){
    const card=document.getElementById('hbcard-'+id);
    const btns=card?.querySelectorAll('button');
    btns?.forEach(b=>{b.disabled=true;b.style.opacity='.5';});
    try{await fn();window.App?.toast(okMsg,'ok');await render();}
    catch(e){window.App?.toast(e?.message||errMsg,'err');btns?.forEach(b=>{b.disabled=false;b.style.opacity='1';});}
  }

  function confirm(id){if(!window.confirm('Confirmar reserva? O locatário será notificado.'))return;return _action(id,()=>API.rental.confirmBooking(id),'Erro ao confirmar.','✅ Reserva confirmada!');}
  function decline(id){const r=window.prompt('Motivo da recusa (opcional):')?? '';return _action(id,()=>API.rental.declineBooking(id,{reason:r}),'Erro ao recusar.','✖ Reserva recusada.');}
  function checkin(id){if(!window.confirm('Confirma que o locatário retirou o veículo?'))return;return _action(id,()=>API.rental.checkinBooking(id),'Erro no check-in.','🚗 Check-in registrado!');}
  function checkout(id){if(!window.confirm('Confirma que o veículo foi devolvido?'))return;return _action(id,()=>API.rental.checkoutBooking(id),'Erro no check-out.','🏁 Devolução registrada!');}
  function switchTab(tab){renderList(tab);}

  return{render,switchTab,confirm,decline,checkin,checkout};
})();
