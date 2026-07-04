window.updateSidebarRoles = function(user) {
  const isAdmin    = user && ['ADMIN','SUPER_ADMIN'].includes(user.role);
  const isLoggedIn = !!user;
  const sbA = document.getElementById('sbAdminAprov');
  if (sbA) sbA.style.display = isAdmin ? '' : 'none';
  const sbAL = document.getElementById('sbAdminAnuncios');
  if (sbAL) sbAL.style.display = isAdmin ? '' : 'none';
  const sbR = document.getElementById('sbPainelReceita');
  if (sbR) sbR.style.display = isAdmin ? '' : 'none';
  if (isAdmin) { AdminApproval.fetchPendingCount(); AdminApproval.fetchPendingListingsCount(); }
  const sbSecCentral = document.getElementById('sbSecCentral');
  if (sbSecCentral) sbSecCentral.style.display = isLoggedIn ? '' : 'none';
  const sbDivCentral = document.getElementById('sbDivCentral');
  if (sbDivCentral) sbDivCentral.style.display = isLoggedIn ? '' : 'none';
  const sbConv = document.getElementById('sbConversas');
  if (sbConv) sbConv.style.display = isLoggedIn ? '' : 'none';
};
window.AdminApproval = (() => {
  function esc(s){ return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):''; }
  async function fetchPendingCount(){
    try{ const r=await API.req('GET','/monetization/admin/providers/pending/count');
    const c=r.data?.count||0; const b=document.getElementById('sbPendingBadge');
    if(b){b.textContent=c;b.style.display=c>0?'':'none';} }catch{}
  }
  async function render(){
    const m=document.getElementById('main'); if(!m) return;
    m.innerHTML=`<div class="page-header"><h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">APROVACAO DE PRESTADORES</h2><p style="color:var(--muted);font-size:.85rem;margin-top:4px">Revise e aprove parceiros pendentes</p>
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
      <button id="btnRelease" onclick="AdminApproval.releasePending(this)"
        style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.35);color:#10b981;
               padding:8px 16px;border-radius:8px;font-family:'Space Grotesk',sans-serif;
               font-weight:600;font-size:.8rem;cursor:pointer">
        💰 Liberar Saldos Pendentes
      </button>
    </div>
    </div><div id="approvalList" style="display:flex;flex-direction:column;gap:14px;margin-top:18px"><div class="callout" style="color:var(--muted)">Carregando...</div></div><div id="approvalPagination" style="display:flex;justify-content:center;gap:10px;margin-top:20px"></div>`;
    await loadPending(1);
  }
  async function loadPending(page=1){
    const list=document.getElementById('approvalList'); if(!list) return;
    try{
      const r=await API.req('GET',`/monetization/admin/providers/pending?page=${page}&limit=10`);
      const {providers,pagination}=r.data;
      if(!providers.length){ list.innerHTML='<div class="callout ok" style="text-align:center;padding:28px">Nenhum parceiro pendente!</div>'; return; }
      list.innerHTML=providers.map(p=>`<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;background:var(--card-bg)"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:200px"><div style="font-weight:700;font-size:1rem">${esc(p.name)}</div><div style="font-size:.78rem;color:var(--muted);margin:4px 0">${esc(p.vertical)} - ${esc(p.city)}/${esc(p.state)}${p.cnpj?' - CNPJ:'+esc(p.cnpj):''}</div>${p.description?`<div style="font-size:.82rem;margin-bottom:6px">${esc(p.description.slice(0,160))}</div>`:''}<div style="font-size:.75rem;color:var(--muted)">Solicitante: <strong>${esc(p.owner?.name||'-')}</strong> (${esc(p.owner?.email||'-')}) - Role: <code>${p.owner?.role||'-'}</code></div></div><div style="display:flex;flex-direction:column;gap:8px;min-width:120px"><button class="ai-btn" style="font-size:.8rem;padding:8px 14px;justify-content:center" onclick="AdminApproval.approve('${p.id}',this)">Aprovar</button><button class="ai-btn" style="font-size:.8rem;padding:8px 14px;justify-content:center;background:rgba(255,60,60,.12);color:var(--red);border:1px solid rgba(255,60,60,.3)" onclick="AdminApproval.reject('${p.id}',this)">Rejeitar</button></div></div></div>`).join('');
      const b=document.getElementById('sbPendingBadge'); if(b){b.textContent=pagination.total;b.style.display=pagination.total>0?'':'none';}
    }catch(e){ list.innerHTML=`<div class="callout error">Erro: ${e.message}</div>`; }
  }
  async function approve(id,btn){
    if(!confirm('Aprovar? Usuario recebera role MECHANIC.')) return;
    const orig=btn?.innerHTML; if(btn){btn.disabled=true;btn.innerHTML='...';}
    try{ const r=await API.req('PATCH',`/monetization/providers/${id}/approve`); Toast.show(r.message||'Aprovado!','ok'); await loadPending(1); }
    catch(e){ Toast.show(e.message||'Erro','error'); if(btn){btn.disabled=false;btn.innerHTML=orig;} }
  }
  async function reject(id,btn){
    const reason=prompt('Motivo (opcional):'); if(reason===null) return;
    const orig=btn?.innerHTML; if(btn){btn.disabled=true;btn.innerHTML='...';}
    try{ const r=await API.req('PATCH',`/monetization/providers/${id}/reject`,{reason:reason||''}); Toast.show(r.message||'Rejeitado.','warn'); await loadPending(1); }
    catch(e){ Toast.show(e.message||'Erro','error'); if(btn){btn.disabled=false;btn.innerHTML=orig;} }
  }
  async function releasePending(btn) {
    if (!confirm('Liberar todos os saldos pendentes expirados? Esta ação não pode ser desfeita.')) return;
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Liberando...'; }
    try {
      const r = await API.wallet.releasePending();
      Toast.show(r?.message || `${r?.data?.released ?? 0} saldos liberados.`, 'ok');
    } catch(e) {
      Toast.show(e?.message || 'Erro ao liberar saldos.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
  }

  // ── Moderação de anúncios (classificados) ─────────────────────────────
  async function fetchPendingListingsCount(){
    try{ const r=await API.req('GET','/listings/admin/pending/count');
    const c=r.data?.count||0; const b=document.getElementById('sbListingPendingBadge');
    if(b){b.textContent=c;b.style.display=c>0?'':'none';} }catch{}
  }

  function listingImg(l){
    let imgs=[];
    try{ imgs = Array.isArray(l.images) ? l.images : JSON.parse(l.images||'[]'); }catch{ imgs=[]; }
    return imgs[0]||'';
  }

  async function renderListings(){
    const m=document.getElementById('main'); if(!m) return;
    m.innerHTML=`<div class="page-header"><h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">APROVAÇÃO DE ANÚNCIOS</h2><p style="color:var(--muted);font-size:.85rem;margin-top:4px">Revise e aprove anúncios pendentes dos classificados</p></div><div id="listingApprovalList" style="display:flex;flex-direction:column;gap:14px;margin-top:18px"><div class="callout" style="color:var(--muted)">Carregando...</div></div><div id="listingApprovalPagination" style="display:flex;justify-content:center;gap:10px;margin-top:20px"></div>`;
    await loadPendingListings(1);
  }

  async function loadPendingListings(page=1){
    const list=document.getElementById('listingApprovalList'); if(!list) return;
    try{
      const r=await API.req('GET',`/listings/admin/pending?page=${page}&limit=10`);
      const listings=r.data||[]; const pagination=r.pagination||{};
      if(!listings.length){ list.innerHTML='<div class="callout ok" style="text-align:center;padding:28px">Nenhum anúncio pendente!</div>'; return; }
      list.innerHTML=listings.map(l=>{
        const img=listingImg(l);
        return `<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;background:var(--card-bg);display:flex;gap:14px;flex-wrap:wrap">
          <div style="width:96px;height:72px;border-radius:8px;overflow:hidden;flex-shrink:0;background:var(--s3);display:flex;align-items:center;justify-content:center">
            ${img?`<img src="${esc(img)}" style="width:100%;height:100%;object-fit:cover">`:'<span style="font-size:1.8rem">🚗</span>'}
          </div>
          <div style="flex:1;min-width:200px">
            <div style="font-weight:700;font-size:1rem">${esc(l.title)}</div>
            <div style="font-size:.78rem;color:var(--muted);margin:4px 0">${esc(l.type)} · R$ ${parseFloat(l.price||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} · ${esc(l.city)}/${esc(l.state)}</div>
            ${l.description?`<div style="font-size:.8rem;margin-bottom:6px">${esc(l.description.slice(0,160))}${l.description.length>160?'…':''}</div>`:''}
            <div style="font-size:.75rem;color:var(--muted)">Anunciante: <strong>${esc(l.user?.name||'-')}</strong> (${esc(l.user?.email||'-')})</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:120px">
            <button class="ai-btn" style="font-size:.8rem;padding:8px 14px;justify-content:center" onclick="AdminApproval.approveListing('${l.id}',this)">Aprovar</button>
            <button class="ai-btn" style="font-size:.8rem;padding:8px 14px;justify-content:center;background:rgba(255,60,60,.12);color:var(--red);border:1px solid rgba(255,60,60,.3)" onclick="AdminApproval.rejectListing('${l.id}',this)">Rejeitar</button>
          </div>
        </div>`;
      }).join('');
      const b=document.getElementById('sbListingPendingBadge'); if(b){b.textContent=pagination.total;b.style.display=pagination.total>0?'':'none';}
      const pager=document.getElementById('listingApprovalPagination');
      if(pager && pagination.totalPages>1){
        const pages=Array.from({length:Math.min(pagination.totalPages,7)},(_,i)=>i+1);
        pager.innerHTML=pages.map(p=>`<button onclick="AdminApproval.loadPendingListings(${p})" style="padding:7px 13px;border-radius:6px;font-size:.8rem;cursor:pointer;background:${p===page?'var(--q2)':'var(--s3)'};color:${p===page?'#fff':'var(--muted)'};border:1px solid ${p===page?'var(--q3)':'var(--border)'}">${p}</button>`).join('');
      } else if(pager){ pager.innerHTML=''; }
    }catch(e){ list.innerHTML=`<div class="callout error">Erro: ${e.message}</div>`; }
  }

  async function approveListing(id,btn){
    if(!confirm('Aprovar este anúncio? Ele ficará visível publicamente nos classificados.')) return;
    const orig=btn?.innerHTML; if(btn){btn.disabled=true;btn.innerHTML='...';}
    try{ const r=await API.req('PATCH',`/listings/${id}/approve`); Toast.show(r.message||'Aprovado!','ok'); await loadPendingListings(1); }
    catch(e){ Toast.show(e.message||'Erro','error'); if(btn){btn.disabled=false;btn.innerHTML=orig;} }
  }

  async function rejectListing(id,btn){
    const reason=prompt('Motivo da rejeição (opcional):'); if(reason===null) return;
    const orig=btn?.innerHTML; if(btn){btn.disabled=true;btn.innerHTML='...';}
    try{ const r=await API.req('PATCH',`/listings/${id}/reject`,{reason:reason||''}); Toast.show(r.message||'Rejeitado.','warn'); await loadPendingListings(1); }
    catch(e){ Toast.show(e.message||'Erro','error'); if(btn){btn.disabled=false;btn.innerHTML=orig;} }
  }

  return {
    render, approve, reject, fetchPendingCount, loadPending, releasePending,
    renderListings, loadPendingListings, approveListing, rejectListing, fetchPendingListingsCount,
  };
})();
