window.RentalGuest = (() => {
  const SM={PENDING:{label:'Aguardando',color:'var(--gold)',bg:'rgba(251,191,36,.12)',border:'rgba(251,191,36,.3)',icon:'⏳'},CONFIRMED:{label:'Confirmado',color:'var(--neon)',bg:'rgba(0,245,255,.10)',border:'rgba(0,245,255,.3)',icon:'✅'},ACTIVE:{label:'Em curso',color:'var(--green)',bg:'rgba(16,185,129,.10)',border:'rgba(16,185,129,.3)',icon:'🚗'},COMPLETED:{label:'Concluído',color:'var(--muted)',bg:'rgba(100,116,139,.1)',border:'rgba(100,116,139,.3)',icon:'🏁'},CANCELLED:{label:'Cancelado',color:'var(--red)',bg:'rgba(239,68,68,.10)',border:'rgba(239,68,68,.3)',icon:'✖️'},DECLINED:{label:'Recusado',color:'var(--red)',bg:'rgba(239,68,68,.10)',border:'rgba(239,68,68,.3)',icon:'🚫'}};
  const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtD=iso=>{if(!iso)return'—';const d=new Date(iso);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});};
  const fmtBRL=v=>`R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const badge=s=>{const m=SM[s]||{label:s,color:'var(--muted)',bg:'rgba(0,0,0,.2)',border:'rgba(255,255,255,.1)',icon:'•'};return`<span style="font-family:'JetBrains Mono',monospace;font-size:.63rem;padding:3px 9px;border-radius:4px;background:${m.bg};color:${m.color};border:1px solid ${m.border}">${m.icon} ${m.label}</span>`;};

  function bookingCard(b){
    const sm=SM[b.status]||{};
    const host=b.host||{};
    const canCancel=b.status==='PENDING';
    return`<div id="gbcard-${esc(b.id)}" style="background:var(--s2);border:1px solid ${sm.border||'var(--border)'};border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:10px;transition:border-color .2s" onmouseover="this.style.borderColor='rgba(0,245,255,.25)'" onmouseout="this.style.borderColor='${sm.border||'var(--border)'}'">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.3rem">🗝️</span><div><div style="font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:2px;color:var(--neon)">RESERVA #${esc(b.id.slice(-6).toUpperCase())}</div><div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${fmtD(b.createdAt)}</div></div></div>
        ${badge(b.status)}
      </div>
      ${b.status==='PENDING'?`<div style="font-size:.72rem;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:6px;padding:8px 11px;color:var(--gold);font-family:'JetBrains Mono',monospace">⏳ Aguardando confirmação do anfitrião. Você receberá uma notificação.</div>`:''}
      ${b.status==='CONFIRMED'?`<div style="font-size:.72rem;background:rgba(0,245,255,.07);border:1px solid rgba(0,245,255,.2);border-radius:6px;padding:8px 11px;color:var(--neon);font-family:'JetBrains Mono',monospace">✅ Reserva confirmada! Dirija-se ao local na data do check-in.</div>`:''}
      ${b.status==='DECLINED'?`<div style="font-size:.72rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:6px;padding:8px 11px;color:var(--red);font-family:'JetBrains Mono',monospace">🚫 Recusado pelo anfitrião.${b.declineReason?' Motivo: '+esc(b.declineReason):''}</div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">RETIRADA</div><div style="font-family:'JetBrains Mono',monospace">${fmtD(b.startDate)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">DEVOLUÇÃO</div><div style="font-family:'JetBrains Mono',monospace">${fmtD(b.endDate)}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">DIÁRIAS</div><div style="font-family:'JetBrains Mono',monospace;color:var(--neon)">${b.totalDays||'?'}</div></div>
        <div style="font-size:.72rem;color:var(--muted)"><div style="color:var(--text-dim);margin-bottom:2px">TOTAL PAGO</div><div style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${fmtBRL(b.totalAmount)}</div></div>
      </div>
      ${host.name?`<div style="background:var(--s3);border-radius:7px;padding:9px 12px;display:flex;align-items:center;gap:9px"><span style="font-size:1rem">🏠</span><div><div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:1px">ANFITRIÃO</div><div style="font-size:.82rem;color:var(--text);font-weight:600">${esc(host.name)}</div>${host.phone?`<div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace">${esc(host.phone)}</div>`:''}</div></div>`:''}
      ${canCancel?`<button onclick="RentalGuest.cancel('${esc(b.id)}')" style="width:100%;background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:9px;font-weight:600;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif;margin-top:2px">✖ Cancelar Reserva</button>`:''}
    </div>`;
  }

  async function render(){
    if(!API.isAuth()){window.App?.toast('Faça login para ver suas reservas.','warn');window.MobyaAuth?.showLogin();return;}
    const main=document.getElementById('main');if(!main)return;
    main.innerHTML=`<div style="margin-bottom:24px"><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:4px;background:linear-gradient(135deg,#fff,var(--neon),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent">MINHAS RESERVAS</div><div style="color:var(--muted);font-size:.84rem;margin-top:4px">Histórico e status das suas locações</div></div>
    <div id="rg-list"><div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;text-align:center;padding:40px">⟳ Carregando...</div></div>`;
    try{
      const r=await API.rental.myBookings({limit:50});
      const list=r?.data?.bookings||r?.data||[];
      const el=document.getElementById('rg-list');if(!el)return;
      if(!list.length){el.innerHTML=`<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">🗝️</div><div style="font-family:'JetBrains Mono',monospace;font-size:.78rem;margin-bottom:16px">Você ainda não tem reservas.</div><button onclick="App.navigate('aluguel')" style="background:linear-gradient(135deg,var(--green),#059669);color:#fff;border:none;border-radius:8px;padding:10px 22px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">🔍 Buscar veículos</button></div>`;return;}
      el.innerHTML=`<div style="display:flex;flex-direction:column;gap:14px">${list.map(bookingCard).join('')}</div>`;
    }catch(e){const el=document.getElementById('rg-list');if(el)el.innerHTML=`<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:24px;text-align:center"><div style="font-size:1.5rem;margin-bottom:8px">⚠️</div><div style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:.8rem">${e?.message||'Erro ao carregar reservas'}</div><button onclick="RentalGuest.render()" style="margin-top:16px;background:var(--s2);border:1px solid var(--border);color:var(--neon);border-radius:8px;padding:8px 18px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:.72rem">↺ Tentar novamente</button></div>`;}
  }

  async function cancel(id){
    if(!window.confirm('Cancelar esta reserva?'))return;
    const card=document.getElementById('gbcard-'+id);
    const btn=card?.querySelector('button');
    if(btn){btn.disabled=true;btn.style.opacity='.5';}
    try{
      await API.rental.cancelBooking(id,{reason:'Cancelado pelo locatário'});
      window.App?.toast('Reserva cancelada.','ok');
      await render();
    }catch(e){
      window.App?.toast(e?.message||'Erro ao cancelar.','err');
      if(btn){btn.disabled=false;btn.style.opacity='1';}
    }
  }

  return{render,cancel};
})();
