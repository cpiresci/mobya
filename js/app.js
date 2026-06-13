window.App=((()=>{
function toast(msg,type='ok'){const c={ok:'rgba(16,185,129,.14)',err:'rgba(244,63,94,.14)',warn:'rgba(251,191,36,.11)',info:'rgba(0,245,255,.09)'};const t=document.createElement('div');t.style.cssText=`position:fixed;bottom:24px;right:24px;z-index:9999;padding:13px 20px;border-radius:10px;font-family:'Space Grotesk',sans-serif;font-size:.82rem;font-weight:500;max-width:360px;background:${c[type]||c.info};backdrop-filter:blur(14px);box-shadow:0 8px 28px rgba(0,0,0,.45)`;t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3600);}

async function boot(){
  const ls=document.getElementById('ls');
  const fill=document.getElementById('lsFill');
  const txt=document.getElementById('lsTxt');
  const steps=['Iniciando motor quântico...','Carregando agentes NEXUS...','Conectando IA...','Sincronizando...','MOBYA ONLINE ✓'];
  let i=0;
  const tick=()=>{
    if(i>=steps.length){if(ls){ls.style.opacity='0';setTimeout(()=>{ls.style.display='none';},500);}renderPage('home');return;}
    if(fill)fill.style.width=`${Math.round((i+1)/steps.length*100)}%`;
    if(txt)txt.textContent=steps[i];i++;
    setTimeout(tick,i===steps.length?300:250);
  };
  tick();

  // bind nav
  document.querySelectorAll('.nb[data-page]').forEach(b=>b.addEventListener('click',()=>renderPage(b.dataset.page)));
  document.querySelectorAll('.sb-item[data-page]').forEach(b=>b.addEventListener('click',()=>renderPage(b.dataset.page)));

  // auth
  try{const u=await Promise.race([API.me(),new Promise((_,r)=>setTimeout(()=>r('timeout'),5000))]);if(u?.data){const btn=document.getElementById('btnCta');if(btn){btn.textContent=u.data.name?.split(' ')[0]||'Perfil';btn.onclick=()=>renderPage('dashboard');}}}catch(e){}

  // api status (non-blocking)
  API.ping().catch(()=>{});
}

window.renderPage=function(page){
  document.querySelectorAll('.nb,.sb-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const m=document.getElementById('main');if(m)m.scrollTop=0;
  if(page.startsWith('listing-')){Pages.renderListing(page.slice(8));return;}
  const map={home:Pages.renderHome,classificados:Pages.renderClassificados,agentes:Pages.renderAgentes,emergencia:Pages.renderEmergencia,calculadoras:Pages.renderCalculadoras,vistoria:Pages.renderVistoria,documentacao:Pages.renderDocumentacao,dashboard:Pages.renderDashboard,monetizacao:()=>renderPage_mon('monetizacao'),'seguros-sim':()=>renderPage_mon('seguros-sim'),fretes:()=>renderPage_mon('fretes'),'painel-receita':()=>renderPage_mon('painel-receita')};
  const fn=map[page];if(fn)fn();else Pages.renderHome();
};

function renderPage_mon(p){if(typeof Monetization!=='undefined'&&Monetization._pages&&Monetization._pages[p])Monetization._pages[p]();else Pages.renderHome();}

window.toggleMenu=function(){const sb=document.getElementById('sidebar');if(!sb)return;const open=sb.classList.toggle('open');let ov=document.getElementById('menuOverlay');if(open){if(!ov){ov=document.createElement('div');ov.id='menuOverlay';ov.style.cssText='position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.5)';ov.onclick=()=>{sb.classList.remove('open');ov.remove();};document.body.appendChild(ov);}}else ov?.remove();};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
return{toast};
}))();
