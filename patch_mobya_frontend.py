import os, sys
BASE = os.path.expanduser('~/mobya-master')

ADMIN_JS = r"""window.updateSidebarRoles = function(user) {
  const isMechanic = user && ['MECHANIC','INSURER','SELLER'].includes(user.role);
  const isAdmin    = user && ['ADMIN','SUPER_ADMIN'].includes(user.role);
  const sbP = document.getElementById('sbPainelPrestador');
  if (sbP) sbP.style.display = (isMechanic || isAdmin) ? '' : 'none';
  const sbA = document.getElementById('sbAdminAprov');
  if (sbA) sbA.style.display = isAdmin ? '' : 'none';
  if (isAdmin) AdminApproval.fetchPendingCount();
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
    m.innerHTML=`<div class="page-header"><h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:2px">APROVACAO DE PRESTADORES</h2><p style="color:var(--muted);font-size:.85rem;margin-top:4px">Revise e aprove parceiros pendentes</p></div><div id="approvalList" style="display:flex;flex-direction:column;gap:14px;margin-top:18px"><div class="callout" style="color:var(--muted)">Carregando...</div></div><div id="approvalPagination" style="display:flex;justify-content:center;gap:10px;margin-top:20px"></div>`;
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
  return {render,approve,reject,fetchPendingCount,loadPending};
})();
"""

js_path = os.path.join(BASE,'js/admin-approval.js')
if os.path.exists(js_path):
    print('SKIP admin-approval.js: ja existe')
else:
    with open(js_path,'w') as f: f.write(ADMIN_JS)
    print('OK: js/admin-approval.js')

def patch(path,old,new,label):
    if not os.path.exists(path): print('ERRO:',path); return
    with open(path) as f: s=f.read()
    if old not in s: print('SKIP:',label); return
    with open(path,'w') as f: f.write(s.replace(old,new,1))
    print('OK:',label)

html=os.path.join(BASE,'index.html')
patch(html,
  '<div class="sb-item" data-page="painel-prestador">\U0001f6e0\ufe0f Painel do Prestador</div>',
  '<div class="sb-item sb-role-mechanic" data-page="painel-prestador" id="sbPainelPrestador" style="display:none">\U0001f6e0\ufe0f Painel do Prestador</div>',
  'sidebar prestador oculto')
patch(html,
  '<div class="sb-item" data-page="dashboard">\U0001f4ca Dashboard</div>',
  '<div class="sb-item" data-page="dashboard">\U0001f4ca Dashboard</div>\n      <div class="sb-item sb-role-admin" data-page="admin-aprovacao" id="sbAdminAprov" style="display:none">\u2705 Aprovar Prestadores <span class="sb-badge r" id="sbPendingBadge" style="display:none">0</span></div>',
  'sidebar admin-aprovacao')
patch(html,
  '<script src="js/monetization.js?v=20260618"></script>\n<script src="js/app.js?v=20260618"></script>',
  '<script src="js/monetization.js?v=20260618"></script>\n<script src="js/admin-approval.js?v=20260618"></script>\n<script src="js/app.js?v=20260618"></script>',
  'script tag admin-approval')

patch(os.path.join(BASE,'js/auth.js'),
  "      btn.onclick = () => showLogin();\n    }\n  }",
  "      btn.onclick = () => showLogin();\n    }\n    if (typeof updateSidebarRoles === 'function') updateSidebarRoles(u);\n  }",
  'auth.js updateUI hook')

patch(os.path.join(BASE,'js/app.js'),
  "  'painel-prestador':() => (typeof Monetization !== 'undefined' && Monetization.renderProviderDashboard ? Monetization.renderProviderDashboard() : comingSoon('PAINEL DO PRESTADOR','\U0001f6e0\ufe0f')),",
  "  'painel-prestador':() => (typeof Monetization !== 'undefined' && Monetization.renderProviderDashboard ? Monetization.renderProviderDashboard() : comingSoon('PAINEL DO PRESTADOR','\U0001f6e0\ufe0f')),\n  'admin-aprovacao':() => { const u=MobyaAuth.getUser(); if(!u||!['ADMIN','SUPER_ADMIN'].includes(u.role)){App.navigate('home');return;} if(typeof AdminApproval!=='undefined') AdminApproval.render(); else comingSoon('APROVACAO','\u2705'); },",
  'app.js rota admin-aprovacao')

os.chdir(BASE)
os.system('git add js/admin-approval.js js/auth.js js/app.js index.html')
os.system('git commit -m "feat: sidebar role-gate + painel admin aprovacao"')
os.system('git push')
print('DONE!')
