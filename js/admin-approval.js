window.updateSidebarRoles = function(user) {
  const isMechanic = user && ['MECHANIC','INSURER','SELLER'].includes(user.role);
  const isAdmin    = user && ['ADMIN','SUPER_ADMIN'].includes(user.role);
  const sbP = document.getElementById('sbPainelPrestador');
  if (sbP) sbP.style.display = (isMechanic || isAdmin) ? '' : 'none';
  const sbC = document.getElementById('sbCarteira');
  if (sbC) sbC.style.display = isMechanic ? '' : 'none';
  const sbA = document.getElementById('sbAdminAprov');
  if (sbA) sbA.style.display = isAdmin ? '' : 'none';
  const sbR = document.getElementById('sbPainelReceita');
  if (sbR) sbR.style.display = isAdmin ? '' : 'none';
  if (isAdmin) AdminApproval.fetchPendingCount();
  const isLoggedIn = !!user;
  const sbAnf = document.getElementById('sbPainelAnfitriao');
  if (sbAnf) sbAnf.style.display = isLoggedIn ? '' : 'none';
  const sbRes = document.getElementById('sbMinhasReservas');
  if (sbRes) sbRes.style.display = isLoggedIn ? '' : 'none';
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
  return {render,approve,reject,fetchPendingCount,loadPending,releasePending};
})();
