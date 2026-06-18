// ============================================================
// MOBYA — pages-extra.js
// Páginas: Reboque, Chaveiro, Aluguel
// Carregar APÓS app.js no index.html
// ============================================================

(function () {

  // ── UTILITÁRIOS ────────────────────────────────────────────
  const main = () => document.getElementById('main');
  const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0})}`;

  // ── REBOQUE & GUINCHO ──────────────────────────────────────
  function renderReboque() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">

  <!-- HERO -->
  <div class="px-hero px-hero--red">
    <div class="px-hero-icon">🚛</div>
    <div>
      <div class="px-hero-title">REBOQUE & GUINCHO</div>
      <div class="px-hero-sub">Atendimento 24h · Chegada em até 30 min</div>
    </div>
    <div class="px-badge px-badge--live">● AO VIVO</div>
  </div>

  <!-- BOTÃO EMERGÊNCIA -->
  <button class="px-btn-sos" onclick="PagesExtra.solicitarReboque()">
    🚨 SOLICITAR REBOQUE AGORA
  </button>

  <!-- STATUS EM TEMPO REAL -->
  <div class="px-card">
    <div class="px-card-title">◈ MOTORISTAS DISPONÍVEIS</div>
    <div class="px-grid3" id="reboqueDrivers">
      ${_driverCards()}
    </div>
  </div>

  <!-- SERVIÇOS -->
  <div class="px-card-title" style="margin:24px 0 12px">NOSSOS SERVIÇOS</div>
  <div class="px-grid2">
    ${_serviceCard('🚛','Guincho Plataforma','Veículos de passeio e SUVs','R$ 180','reboque')}
    ${_serviceCard('🏍️','Moto Guincho','Motos e scooters','R$ 120','reboque')}
    ${_serviceCard('🚚','Guincho Pesado','Caminhões e vans','R$ 350','reboque')}
    ${_serviceCard('⛽','Combustível','Entrega no local','R$ 40','reboque')}
    ${_serviceCard('🔋','Pane Elétrica','Carga de bateria','R$ 80','reboque')}
    ${_serviceCard('🔑','Abertura de Porta','Sem danos ao veículo','R$ 100','chaveiro')}
  </div>

  <!-- RASTREAMENTO SIMULADO -->
  <div class="px-card" id="reboqueTracking" style="display:none">
    <div class="px-card-title">◈ SEU ATENDIMENTO</div>
    <div class="px-tracking">
      <div class="px-track-step px-track-done">✓ Solicitação recebida</div>
      <div class="px-track-step px-track-active" id="trStep2">⟳ Motorista a caminho</div>
      <div class="px-track-step" id="trStep3">○ Chegada ao local</div>
      <div class="px-track-step" id="trStep4">○ Serviço concluído</div>
    </div>
    <div class="px-eta" id="reboqueETA">Chegada estimada: <strong>18 min</strong></div>
  </div>

  <!-- AVALIAÇÕES -->
  <div class="px-card">
    <div class="px-card-title">◈ AVALIAÇÕES RECENTES</div>
    ${_review('Carlos M.','⭐⭐⭐⭐⭐','Atendimento rápido! Motorista chegou em 22 minutos.','2h atrás')}
    ${_review('Ana P.','⭐⭐⭐⭐⭐','Muito profissional, salvou meu dia!','5h atrás')}
    ${_review('Roberto S.','⭐⭐⭐⭐','Bom serviço, preço justo.','ontem')}
  </div>

</div>`;
  }

  function _driverCards() {
    const drivers = [
      {name:'João Silva', dist:'1,2 km', eta:'8 min', rating:'4.9', status:'livre'},
      {name:'Pedro Lima', dist:'2,4 km', eta:'14 min', rating:'4.8', status:'livre'},
      {name:'Marcos R.', dist:'3,1 km', eta:'20 min', rating:'4.7', status:'ocupado'},
    ];
    return drivers.map(d => `
      <div class="px-driver ${d.status==='ocupado'?'px-driver--busy':''}">
        <div class="px-driver-avatar">🚛</div>
        <div class="px-driver-name">${d.name}</div>
        <div class="px-driver-info">${d.dist} · ${d.eta}</div>
        <div class="px-driver-rating">★ ${d.rating}</div>
        <div class="px-driver-status ${d.status==='livre'?'px-status-free':'px-status-busy'}">${d.status==='livre'?'● Livre':'● Ocupado'}</div>
      </div>`).join('');
  }

  function _serviceCard(icon, title, desc, price, page) {
    return `
    <div class="px-svc" onclick="App.navigate('${page}')">
      <div class="px-svc-icon">${icon}</div>
      <div class="px-svc-title">${title}</div>
      <div class="px-svc-desc">${desc}</div>
      <div class="px-svc-price">${price}</div>
    </div>`;
  }

  function _review(name, stars, text, time) {
    return `
    <div class="px-review">
      <div class="px-review-top"><span class="px-review-name">${name}</span><span class="px-review-time">${time}</span></div>
      <div>${stars}</div>
      <div class="px-review-text">${text}</div>
    </div>`;
  }

  // ── CHAVEIRO AUTO ──────────────────────────────────────────
  function renderChaveiro() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">

  <div class="px-hero px-hero--purple">
    <div class="px-hero-icon">🔑</div>
    <div>
      <div class="px-hero-title">CHAVEIRO AUTOMOTIVO</div>
      <div class="px-hero-sub">Abertura, cópia e codificação · 24 horas</div>
    </div>
    <div class="px-badge px-badge--live">● AO VIVO</div>
  </div>

  <button class="px-btn-sos px-btn-sos--purple" onclick="PagesExtra.solicitarChaveiro()">
    🔑 SOLICITAR CHAVEIRO AGORA
  </button>

  <div class="px-card-title" style="margin:24px 0 12px">SERVIÇOS DISPONÍVEIS</div>
  <div class="px-grid2">
    ${_chaveiroCard('🚪','Abertura de Porta','Porta travada sem danos','R$ 100 – 180')}
    ${_chaveiroCard('🔑','Cópia de Chave','Chaves comuns e canivete','R$ 80 – 150')}
    ${_chaveiroCard('📡','Chave Codificada','Transponder e smart key','R$ 250 – 600')}
    ${_chaveiroCard('🔒','Ignição','Reparo e troca de ignição','R$ 200 – 400')}
    ${_chaveiroCard('📱','Key Fob','Programação de controle','R$ 150 – 350')}
    ${_chaveiroCard('🛡️','Cofre Veicular','Instalação de cofre','R$ 300 – 500')}
  </div>

  <div class="px-card">
    <div class="px-card-title">◈ COMO FUNCIONA</div>
    <div class="px-steps">
      <div class="px-step"><div class="px-step-n">1</div><div><strong>Solicite</strong><br>Informe seu veículo e localização</div></div>
      <div class="px-step"><div class="px-step-n">2</div><div><strong>Confirmação</strong><br>Técnico confirmado em 2 minutos</div></div>
      <div class="px-step"><div class="px-step-n">3</div><div><strong>Atendimento</strong><br>Chegada em até 30 minutos</div></div>
      <div class="px-step"><div class="px-step-n">4</div><div><strong>Pagamento</strong><br>Pix, cartão ou dinheiro</div></div>
    </div>
  </div>

  ${_review('Fernanda L.','⭐⭐⭐⭐⭐','Chave codificada do meu Corolla feita na hora!','1h atrás')}
  ${_review('Diego M.','⭐⭐⭐⭐⭐','Abriram meu carro em 10 minutos sem arranhar nada.','3h atrás')}

</div>`;
  }

  function _chaveiroCard(icon, title, desc, price) {
    return `
    <div class="px-svc">
      <div class="px-svc-icon">${icon}</div>
      <div class="px-svc-title">${title}</div>
      <div class="px-svc-desc">${desc}</div>
      <div class="px-svc-price">${price}</div>
    </div>`;
  }

  // ── ALUGUEL DE VEÍCULOS ────────────────────────────────────
  function renderAluguel() {
    const el = main(); if (!el) return;
    const hoje = new Date().toISOString().split('T')[0];
    el.innerHTML = `
<div class="px-extra">

  <div class="px-hero px-hero--cyan">
    <div class="px-hero-icon">🗝️</div>
    <div>
      <div class="px-hero-title">ALUGUEL DE VEÍCULOS</div>
      <div class="px-hero-sub">12 veículos disponíveis agora · Retirada imediata</div>
    </div>
  </div>

  <!-- BUSCA -->
  <div class="px-card">
    <div class="px-card-title">◈ BUSCAR VEÍCULO</div>
    <div class="px-form-row">
      <div class="px-form-group">
        <label>Retirada</label>
        <input type="date" class="px-input" id="aluguelIn" value="${hoje}">
      </div>
      <div class="px-form-group">
        <label>Devolução</label>
        <input type="date" class="px-input" id="aluguelOut">
      </div>
    </div>
    <button class="px-btn" onclick="PagesExtra.buscarVeiculos()">🔍 BUSCAR</button>
  </div>

  <!-- FROTA -->
  <div class="px-card-title" style="margin:24px 0 12px">FROTA DISPONÍVEL</div>
  <div id="aluguelFrota">
    ${_carCard('Econômico','Hyundai HB20 ou similar','⭐ 4.8 · Manual · Ar','R$ 89/dia','🚗','cyan')}
    ${_carCard('Intermediário','Toyota Corolla ou similar','⭐ 4.9 · Automático · Ar','R$ 149/dia','🚙','cyan')}
    ${_carCard('SUV','Jeep Compass ou similar','⭐ 4.9 · Automático · 4x4','R$ 229/dia','🚐','cyan')}
    ${_carCard('Pickup','Hilux ou similar','⭐ 4.7 · Automático · 4x4','R$ 299/dia','🛻','cyan')}
  </div>

  <!-- BENEFÍCIOS -->
  <div class="px-card">
    <div class="px-card-title">◈ INCLUÍDO NO ALUGUEL</div>
    <div class="px-benefits">
      <div class="px-benefit">✅ Seguro básico</div>
      <div class="px-benefit">✅ Assistência 24h</div>
      <div class="px-benefit">✅ KM livre</div>
      <div class="px-benefit">✅ Sem taxa de adesão</div>
      <div class="px-benefit">✅ Cancelamento grátis</div>
      <div class="px-benefit">✅ Entrega no local</div>
    </div>
  </div>

</div>`;

    // Definir data mínima devolução
    const outInput = document.getElementById('aluguelOut');
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    outInput.value = tomorrow.toISOString().split('T')[0];
    outInput.min = hoje;
  }

  function _carCard(cat, name, info, price, icon, color) {
    return `
    <div class="px-car">
      <div class="px-car-icon">${icon}</div>
      <div class="px-car-info">
        <div class="px-car-cat">${cat}</div>
        <div class="px-car-name">${name}</div>
        <div class="px-car-meta">${info}</div>
      </div>
      <div class="px-car-right">
        <div class="px-car-price">${price}</div>
        <button class="px-btn px-btn--sm" onclick="PagesExtra.reservarCarro('${cat}')">Reservar</button>
      </div>
    </div>`;
  }

  // ── AÇÕES ──────────────────────────────────────────────────
  const PagesExtra = {
    solicitarReboque() {
      if (typeof MobyaAuth !== 'undefined' && !MobyaAuth.isLogged()) {
        MobyaAuth.showLogin(); return;
      }
      const t = document.getElementById('reboqueTracking');
      if (t) t.style.display = 'block';
      if (typeof Toast !== 'undefined') Toast.show('🚛 Motorista acionado! Acompanhe o rastreamento abaixo.','ok');
      t && t.scrollIntoView({behavior:'smooth'});
      // Simula progresso
      setTimeout(()=>{ const s=document.getElementById('trStep2'); if(s){s.classList.add('px-track-done');s.textContent='✓ Motorista a caminho';} const s3=document.getElementById('trStep3'); if(s3)s3.classList.add('px-track-active'); }, 8000);
    },
    solicitarChaveiro() {
      if (typeof MobyaAuth !== 'undefined' && !MobyaAuth.isLogged()) {
        MobyaAuth.showLogin(); return;
      }
      if (typeof Toast !== 'undefined') Toast.show('🔑 Técnico acionado! Chegada em até 30 minutos.','ok');
    },
    buscarVeiculos() {
      const i = document.getElementById('aluguelIn')?.value;
      const o = document.getElementById('aluguelOut')?.value;
      if (!i||!o||i>=o) { if(typeof Toast!=='undefined') Toast.show('Selecione datas válidas','err'); return; }
      if (typeof Toast !== 'undefined') Toast.show('🔍 Buscando disponibilidade...','info');
      setTimeout(()=>{ if(typeof Toast!=='undefined') Toast.show('✅ 12 veículos disponíveis no período!','ok'); },1200);
    },
    reservarCarro(cat) {
      if (typeof MobyaAuth !== 'undefined' && !MobyaAuth.isLogged()) {
        MobyaAuth.showLogin(); return;
      }
      if (typeof Toast !== 'undefined') Toast.show(`🗝️ Reserva de ${cat} iniciada! Complete no checkout.`,'ok');
    },
  };
  window.PagesExtra = PagesExtra;
  // Expõe as páginas de render (eram privadas do closure e nunca chegavam
  // a app.js — por isso reboque/chaveiro/aluguel caíam no comingSoon).
  PagesExtra.renderReboque  = renderReboque;
  PagesExtra.renderChaveiro = renderChaveiro;
  PagesExtra.renderAluguel  = renderAluguel;

  // ── CSS INJETADO ───────────────────────────────────────────
  if (!document.getElementById('px-style-pages-extra')) {
  const style = document.createElement('style');
  style.id = 'px-style-pages-extra';
  style.textContent = `
.px-extra{padding:20px;max-width:900px;margin:0 auto}
.px-hero{display:flex;align-items:center;gap:16px;padding:24px;border-radius:16px;margin-bottom:20px;position:relative}
.px-hero--red{background:linear-gradient(135deg,rgba(185,28,28,.25),rgba(244,63,94,.1));border:1px solid rgba(244,63,94,.3)}
.px-hero--purple{background:linear-gradient(135deg,rgba(109,40,217,.25),rgba(168,85,247,.1));border:1px solid rgba(168,85,247,.3)}
.px-hero--cyan{background:linear-gradient(135deg,rgba(14,116,144,.25),rgba(6,182,212,.1));border:1px solid rgba(6,182,212,.3)}
.px-hero-icon{font-size:2.4rem}
.px-hero-title{font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:3px;color:#fff}
.px-hero-sub{color:var(--muted,#888);font-size:.82rem;margin-top:2px}
.px-badge{position:absolute;right:16px;top:16px;font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:20px}
.px-badge--live{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#10b981}
.px-btn-sos{width:100%;padding:18px;border-radius:14px;font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:2px;border:none;cursor:pointer;margin-bottom:20px;background:linear-gradient(135deg,#b91c1c,#f43f5e);color:#fff;box-shadow:0 4px 20px rgba(244,63,94,.35);transition:transform .15s}
.px-btn-sos:active{transform:scale(.98)}
.px-btn-sos--purple{background:linear-gradient(135deg,#6d28d9,#a855f7);box-shadow:0 4px 20px rgba(168,85,247,.35)}
.px-card{background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:18px;margin-bottom:16px}
.px-card-title{font-family:'Bebas Neue',sans-serif;letter-spacing:2px;font-size:1rem;color:var(--muted,#888);margin-bottom:14px}
.px-grid3{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.px-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:16px}
.px-driver{background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:14px;text-align:center}
.px-driver--busy{opacity:.5}
.px-driver-avatar{font-size:1.8rem;margin-bottom:6px}
.px-driver-name{font-weight:600;font-size:.85rem;color:#fff}
.px-driver-info{font-size:.75rem;color:var(--muted,#888);margin:3px 0}
.px-driver-rating{font-size:.78rem;color:#f59e0b}
.px-driver-status{font-size:.72rem;font-weight:700;margin-top:6px}
.px-status-free{color:#10b981}
.px-status-busy{color:#ef4444}
.px-svc{background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:16px;cursor:pointer;transition:border-color .2s}
.px-svc:hover{border-color:rgba(124,58,237,.5)}
.px-svc-icon{font-size:1.8rem;margin-bottom:8px}
.px-svc-title{font-weight:700;font-size:.88rem;color:#fff;margin-bottom:4px}
.px-svc-desc{font-size:.75rem;color:var(--muted,#888);margin-bottom:8px}
.px-svc-price{font-family:'JetBrains Mono',monospace;font-size:.82rem;color:#10b981;font-weight:600}
.px-tracking{display:flex;flex-direction:column;gap:10px;margin:12px 0}
.px-track-step{padding:10px 14px;border-radius:8px;font-size:.84rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:var(--muted,#888)}
.px-track-done{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3);color:#10b981}
.px-track-active{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:#f59e0b}
.px-eta{text-align:center;margin-top:12px;font-size:.88rem;color:var(--muted,#888)}
.px-review{background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:14px;margin-bottom:10px}
.px-review-top{display:flex;justify-content:space-between;margin-bottom:4px}
.px-review-name{font-weight:600;font-size:.84rem;color:#fff}
.px-review-time{font-size:.75rem;color:var(--muted,#888)}
.px-review-text{font-size:.8rem;color:var(--muted,#888);margin-top:6px}
.px-steps{display:flex;flex-direction:column;gap:12px}
.px-step{display:flex;align-items:flex-start;gap:14px}
.px-step-n{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;color:#fff;flex-shrink:0}
.px-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.px-form-group{display:flex;flex-direction:column;gap:6px}
.px-form-group label{font-size:.78rem;color:var(--muted,#888)}
.px-input{background:var(--s1,rgba(255,255,255,.03));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:8px;padding:10px 12px;color:#fff;font-size:.84rem;font-family:'Space Grotesk',sans-serif}
.px-btn{background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:10px;padding:12px 20px;color:#fff;font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1.5px;cursor:pointer;width:100%}
.px-btn--sm{width:auto;padding:8px 14px;font-size:.82rem}
.px-car{display:flex;align-items:center;gap:14px;background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:14px;margin-bottom:10px}
.px-car-icon{font-size:2rem;flex-shrink:0}
.px-car-info{flex:1}
.px-car-cat{font-size:.72rem;color:var(--muted,#888);text-transform:uppercase;letter-spacing:1px}
.px-car-name{font-weight:600;font-size:.88rem;color:#fff;margin:2px 0}
.px-car-meta{font-size:.75rem;color:var(--muted,#888)}
.px-car-right{text-align:right;flex-shrink:0}
.px-car-price{font-family:'JetBrains Mono',monospace;font-size:.88rem;color:#10b981;font-weight:700;margin-bottom:8px}
.px-benefits{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.px-benefit{font-size:.82rem;color:var(--muted,#888);padding:8px 12px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:8px}
@media(max-width:480px){.px-form-row{grid-template-columns:1fr}.px-grid2{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
  }

  // ── ROTEAMENTO ──────────────────────────────────────────────
  // O roteamento real de reboque/chaveiro/aluguel é feito direto em
  // BASE_PAGES (js/app.js), que chama PagesExtra.renderX(). O patch
  // antigo sobrescrevia window.App.navigate, mas os cliques do menu
  // (data-page) chamam a função `navigate` interna do app.js, não
  // App.navigate — então o patch nunca era acionado. Removido.

})();
