// ============================================================
// MOBYA — pages-extra.js
// Páginas: Reboque, Chaveiro, Aluguel, Frete, Mecânico
// Carregar APÓS app.js no index.html
// ============================================================

(function () {

  // ── UTILITÁRIOS ────────────────────────────────────────────
  const main = () => document.getElementById('main');
  const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const esc = t => String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // ── REBOQUE & GUINCHO ──────────────────────────────────────
  function renderReboque() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">
  <div class="px-hero px-hero--red">
    <div class="px-hero-icon">🚛</div>
    <div>
      <div class="px-hero-title">REBOQUE & GUINCHO</div>
      <div class="px-hero-sub">Atendimento 24h · Chegada em até 30 min</div>
    </div>
    <div class="px-badge px-badge--live">● AO VIVO</div>
  </div>
  <button class="px-btn-sos" onclick="PagesExtra.solicitarReboque()">🚨 SOLICITAR REBOQUE AGORA</button>
  <div class="px-card">
    <div class="px-card-title">◈ MOTORISTAS DISPONÍVEIS</div>
    <div class="px-grid3" id="reboqueDrivers">${_driverCards()}</div>
  </div>
  <div class="px-card-title" style="margin:24px 0 12px">NOSSOS SERVIÇOS</div>
  <div class="px-grid2">
    ${_serviceCard('🚛','Guincho Plataforma','Veículos de passeio e SUVs','R$ 180','reboque')}
    ${_serviceCard('🏍️','Moto Guincho','Motos e scooters','R$ 120','reboque')}
    ${_serviceCard('🚚','Guincho Pesado','Caminhões e vans','R$ 350','reboque')}
    ${_serviceCard('⛽','Combustível','Entrega no local','R$ 40','reboque')}
    ${_serviceCard('🔋','Pane Elétrica','Carga de bateria','R$ 80','reboque')}
    ${_serviceCard('🔑','Abertura de Porta','Sem danos ao veículo','R$ 100','chaveiro')}
  </div>
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
  <button class="px-btn-sos px-btn-sos--purple" onclick="PagesExtra.solicitarChaveiro()">🔑 SOLICITAR CHAVEIRO AGORA</button>
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

  // ── FRETE (EMERGÊNCIA 24H) ──────────────────────────────────
  function renderFrete() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">
  <div class="px-hero px-hero--red">
    <div class="px-hero-icon">🚚</div>
    <div>
      <div class="px-hero-title">FRETE & TRANSPORTE</div>
      <div class="px-hero-sub">Carga, mudança e socorro de veículo · 24h</div>
    </div>
    <div class="px-badge px-badge--live">● AO VIVO</div>
  </div>
  <button class="px-btn-sos" onclick="PagesExtra.solicitarFrete()">🚨 SOLICITAR FRETE AGORA</button>
  <div class="px-card">
    <div class="px-card-title">◈ TRANSPORTADORES DISPONÍVEIS</div>
    <div class="px-grid3" id="freteDrivers">${_freteCards()}</div>
  </div>
  <div class="px-card-title" style="margin:24px 0 12px">NOSSOS SERVIÇOS</div>
  <div class="px-grid2">
    ${_serviceCard('🚚','Frete de Veículo','Transporte em cegonha/plataforma','R$ 280','fretes')}
    ${_serviceCard('📦','Mudança de Peças','Entrega de auto peças','R$ 60','fretes')}
    ${_serviceCard('🏍️','Frete de Moto','Transporte de motocicletas','R$ 140','fretes')}
    ${_serviceCard('🛻','Carga Pesada','Caminhões e implementos','R$ 450','fretes')}
  </div>
  <div class="px-card">
    <div class="px-card-title">◈ AVALIAÇÕES RECENTES</div>
    ${_review('Marcelo T.','⭐⭐⭐⭐⭐','Transportou minha moto sem nenhum arranhão.','3h atrás')}
    ${_review('Juliana K.','⭐⭐⭐⭐⭐','Chegou rápido e o preço foi justo.','ontem')}
  </div>
</div>`;
  }

  function _freteCards() {
    const drivers = [
      {name:'Carlos Frete', dist:'2,0 km', eta:'15 min', rating:'4.8', status:'livre'},
      {name:'Transp. Lima', dist:'4,5 km', eta:'24 min', rating:'4.7', status:'livre'},
      {name:'Rota Express', dist:'5,8 km', eta:'30 min', rating:'4.9', status:'ocupado'},
    ];
    return drivers.map(d => `
      <div class="px-driver ${d.status==='ocupado'?'px-driver--busy':''}">
        <div class="px-driver-avatar">🚚</div>
        <div class="px-driver-name">${d.name}</div>
        <div class="px-driver-info">${d.dist} · ${d.eta}</div>
        <div class="px-driver-rating">★ ${d.rating}</div>
        <div class="px-driver-status ${d.status==='livre'?'px-status-free':'px-status-busy'}">${d.status==='livre'?'● Livre':'● Ocupado'}</div>
      </div>`).join('');
  }

  // ── MECÂNICO (EMERGÊNCIA 24H) ───────────────────────────────
  function renderMecanico() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">
  <div class="px-hero px-hero--red">
    <div class="px-hero-icon">🔧</div>
    <div>
      <div class="px-hero-title">MECÂNICO DE EMERGÊNCIA</div>
      <div class="px-hero-sub">Pane no local ou em rota · Atendimento 24h</div>
    </div>
    <div class="px-badge px-badge--live">● AO VIVO</div>
  </div>
  <button class="px-btn-sos" onclick="PagesExtra.solicitarMecanico()">🚨 SOLICITAR MECÂNICO AGORA</button>

  <!-- ── DIAGNÓSTICO AI NEXUS-PD ───────────────────────── -->
  <div class="px-card" style="border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.04)">
    <div class="px-card-title" style="color:var(--q4,#f59e0b)">◈ DIAGNÓSTICO AI — NEXUS-PD</div>
    <p style="font-size:.8rem;color:var(--muted);margin:0 0 14px">Descreva o sintoma e deixe a IA identificar causas, peças (código OEM) e estimativa de custo.</p>
    <div class="px-form-row">
      <div class="px-form-group" style="flex:2">
        <label>Marca</label>
        <input type="text" class="px-input" id="diagBrand" placeholder="Ex: Toyota">
      </div>
      <div class="px-form-group" style="flex:2">
        <label>Modelo</label>
        <input type="text" class="px-input" id="diagModel" placeholder="Ex: Corolla">
      </div>
      <div class="px-form-group" style="flex:1">
        <label>Ano</label>
        <input type="number" class="px-input" id="diagYear" placeholder="2020" min="1990" max="2030">
      </div>
    </div>
    <div class="px-form-group">
      <label>Quilometragem (km)</label>
      <input type="number" class="px-input" id="diagMileage" placeholder="Ex: 85000">
    </div>
    <div class="px-form-group">
      <label>Descreva o sintoma</label>
      <textarea class="px-input" id="diagSymptom" rows="3"
        placeholder="Ex: barulho metálico ao frear, fumaça branca, vibração no volante acima de 80 km/h..."
        style="resize:vertical;min-height:70px"></textarea>
    </div>
    <button class="px-btn" id="diagBtn" onclick="PagesExtra.runDiagnose()">
      🔍 ANALISAR COM IA
    </button>
    <div id="diagResult" style="margin-top:16px"></div>
  </div>

  <div class="px-card">
    <div class="px-card-title">◈ MECÂNICOS DISPONÍVEIS</div>
    <div class="px-grid3" id="mecDrivers">${_mecCards()}</div>
  </div>
  <div class="px-card-title" style="margin:24px 0 12px">NOSSOS SERVIÇOS</div>
  <div class="px-grid2">
    ${_serviceCard('🔧','Pane Mecânica','Diagnóstico e reparo no local','R$ 150','servicos')}
    ${_serviceCard('🔋','Pane Elétrica','Carga ou troca de bateria','R$ 80','servicos')}
    ${_serviceCard('⭕','Pneu Furado','Troca ou reparo no local','R$ 70','servicos')}
    ${_serviceCard('⛽','Pane Seca','Entrega de combustível','R$ 40','servicos')}
    ${_serviceCard('🌡️','Superaquecimento','Verificação do sistema de arrefecimento','R$ 90','servicos')}
  </div>
  <div class="px-card">
    <div class="px-card-title">◈ AVALIAÇÕES RECENTES</div>
    ${_review('Bruno A.','⭐⭐⭐⭐⭐','Resolveu a pane elétrica em 15 minutos.','1h atrás')}
    ${_review('Sandra V.','⭐⭐⭐⭐⭐','Mecânico muito atencioso, explicou tudo.','4h atrás')}
  </div>
</div>`;
  }

  async function runDiagnose() {
    const symptom  = document.getElementById('diagSymptom')?.value?.trim();
    const brand    = document.getElementById('diagBrand')?.value?.trim()    || '';
    const model    = document.getElementById('diagModel')?.value?.trim()    || '';
    const year     = document.getElementById('diagYear')?.value?.trim()     || '';
    const mileage  = document.getElementById('diagMileage')?.value?.trim()  || '';
    const resultEl = document.getElementById('diagResult');
    const btn      = document.getElementById('diagBtn');

    if (!symptom) { if (typeof Toast !== 'undefined') Toast.show('Descreva o sintoma primeiro.', 'warn'); return; }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analisando...'; }
    if (resultEl) resultEl.innerHTML = '<div style="color:var(--muted);font-size:.85rem;text-align:center;padding:20px">🔍 Motor NEXUS-PD analisando...</div>';

    const URGENCY_COLOR = { critico: '#ef4444', urgente: '#f59e0b', monitorar: '#10b981' };
    const URGENCY_ICON  = { critico: '🔴', urgente: '🟡', monitorar: '🟢' };

    try {
      const r = await API.ai.diagnose({
        symptom,
        vehicleBrand: brand,
        vehicleModel: model,
        vehicleYear:  year,
        mileage,
      });

      const d = r?.data || r;
      const urgColor = URGENCY_COLOR[d.urgency] || '#f59e0b';
      const urgIcon  = URGENCY_ICON[d.urgency]  || '⚠️';

      // Causas prováveis
      const causesHTML = (d.causes || []).map(c => `
        <div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;background:var(--s2)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <strong style="font-size:.85rem">${c.cause||c.part||'Causa'}</strong>
            <span style="font-size:.75rem;color:${urgColor};font-weight:700">${c.probability||''}%</span>
          </div>
          ${c.part    ? `<div style="font-size:.75rem;color:var(--muted)">Peça: <code>${c.part}</code>${c.oemCode ? ` · OEM: <code>${c.oemCode}</code>`:''}</div>` : ''}
          ${(c.laborCost||c.partCost) ? `<div style="font-size:.75rem;color:var(--neon);margin-top:3px">Peça: R$${c.partCost||0} · MO: R$${c.laborCost||0}</div>` : ''}
        </div>`).join('');

      resultEl.innerHTML = `
        <!-- Urgência -->
        <div style="background:rgba(${urgColor.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')},0.12);
                    border:1px solid ${urgColor};border-radius:10px;padding:14px;margin-bottom:14px">
          <div style="font-size:1.1rem;font-weight:700;color:${urgColor}">${urgIcon} ${String(d.urgency||'urgente').toUpperCase()}</div>
          ${d.urgencyDescription ? `<div style="font-size:.82rem;margin-top:4px">${d.urgencyDescription}</div>` : ''}
        </div>

        <!-- Ação imediata -->
        ${d.immediateAction ? `
        <div style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:12px;margin-bottom:14px;font-size:.83rem">
          <strong style="color:#10b981">⚡ Ação imediata:</strong><br>${d.immediateAction}
        </div>` : ''}

        <!-- Causas -->
        ${causesHTML ? `<div style="font-size:.78rem;color:var(--muted);margin-bottom:6px;font-weight:600">CAUSAS PROVÁVEIS</div>${causesHTML}` : ''}

        <!-- Estimativa total -->
        ${d.totalEstimate ? `
        <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px">
          <div style="font-size:.78rem;color:var(--muted)">ESTIMATIVA TOTAL</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--neon)">
            R$ ${d.totalEstimate.min||0} – R$ ${d.totalEstimate.max||0}
          </div>
        </div>` : ''}

        <!-- Risco cascata + DIY -->
        <div style="display:flex;gap:10px;margin-bottom:14px">
          ${d.cascadeRisk ? `<div style="flex:1;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:10px;font-size:.78rem"><strong style="color:#ef4444">⚠️ Risco cascata</strong><br>${d.cascadeRisk}</div>` : ''}
          ${d.diyPossible !== undefined ? `<div style="flex:1;background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:10px;font-size:.78rem"><strong style="color:var(--muted)">🔩 DIY possível?</strong><br>${d.diyPossible ? '✅ Sim' : '❌ Não — leve à oficina'}</div>` : ''}
        </div>

        <!-- Provider -->
        <div style="font-size:.7rem;color:var(--muted);text-align:right">
          ${d.fromCache ? '🗄️ Cache' : '🤖 NEXUS-PD'} · ${d.provider||'AI'}
        </div>

        <!-- CTA emergência -->
        <button class="px-btn-sos" style="margin-top:8px;font-size:.85rem;padding:12px"
          onclick="PagesExtra.solicitarMecanico()">🚨 CHAMAR MECÂNICO AGORA</button>
      `;
    } catch (e) {
      if (resultEl) resultEl.innerHTML = `<div style="color:#ef4444;font-size:.83rem;padding:10px">❌ Erro: ${e?.message||'Falha na análise'}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔍 ANALISAR COM IA'; }
    }
  }

  function _mecCards() {
    const drivers = [
      {name:'Edson Mecânico', dist:'1,5 km', eta:'10 min', rating:'4.9', status:'livre'},
      {name:'Rafael Auto', dist:'2,8 km', eta:'16 min', rating:'4.8', status:'livre'},
      {name:'Vinícius Socorro', dist:'3,9 km', eta:'22 min', rating:'4.6', status:'ocupado'},
    ];
    return drivers.map(d => `
      <div class="px-driver ${d.status==='ocupado'?'px-driver--busy':''}">
        <div class="px-driver-avatar">🔧</div>
        <div class="px-driver-name">${d.name}</div>
        <div class="px-driver-info">${d.dist} · ${d.eta}</div>
        <div class="px-driver-rating">★ ${d.rating}</div>
        <div class="px-driver-status ${d.status==='livre'?'px-status-free':'px-status-busy'}">${d.status==='livre'?'● Livre':'● Ocupado'}</div>
      </div>`).join('');
  }

  // ── ALUGUEL DE VEÍCULOS ─────────────────────────────────────
  // Motor de duas pontas (Fase 6) — busca RentalVehicleConfigs reais
  // via GET /rental/configs com filtro por datas (preview de preço),
  // exibe card por veículo e abre modal de reserva com pricing real.
  function renderAluguel() {
    const el = main(); if (!el) return;
    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(); amanha.setDate(amanha.getDate()+1);
    const amanhaStr = amanha.toISOString().split('T')[0];

    el.innerHTML = `
<div class="px-extra">

  <div class="px-hero px-hero--cyan">
    <div class="px-hero-icon">🗝️</div>
    <div>
      <div class="px-hero-title">ALUGUEL DE VEÍCULOS</div>
      <div class="px-hero-sub">Reserve diretamente com anfitriões · Motor Fase 6</div>
    </div>
  </div>

  <!-- ACESSO RÁPIDO -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
    <button onclick="App.navigate('minhas-reservas')" style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:13px 10px;color:var(--neon);font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:border-color .15s" onmouseover="this.style.borderColor='rgba(0,245,255,.35)'" onmouseout="this.style.borderColor='var(--border)'">🗝️ Minhas Reservas</button>
    <button onclick="App.navigate('painel-anfitriao')" style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:13px 10px;color:var(--green);font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:border-color .15s" onmouseover="this.style.borderColor='rgba(16,185,129,.35)'" onmouseout="this.style.borderColor='var(--border)'">🏠 Painel Anfitrião</button>
  </div>

  <!-- FILTRO DE DATAS -->
  <div class="px-card">
    <div class="px-card-title">◈ SELECIONE O PERÍODO</div>
    <div class="px-form-row">
      <div class="px-form-group">
        <label>Retirada</label>
        <input type="date" class="px-input" id="aluguelIn" value="${hoje}" min="${hoje}">
      </div>
      <div class="px-form-group">
        <label>Devolução</label>
        <input type="date" class="px-input" id="aluguelOut" value="${amanhaStr}" min="${amanhaStr}">
      </div>
    </div>
    <button class="px-btn" onclick="PagesExtra.buscarVeiculos()">🔍 BUSCAR VEÍCULOS DISPONÍVEIS</button>
  </div>

  <!-- FROTA -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin:24px 0 12px">
    <div class="px-card-title" style="margin:0">VEÍCULOS DISPONÍVEIS</div>
    <div id="aluguelCount" style="font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted)"></div>
  </div>
  <div id="aluguelFrota">
    <div style="text-align:center;padding:48px;color:var(--muted)">
      <div style="font-size:2rem;margin-bottom:12px">🗝️</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:.78rem">Selecione as datas e clique em Buscar.</div>
    </div>
  </div>

  <!-- COMO FUNCIONA -->
  <div class="px-card" style="margin-top:24px">
    <div class="px-card-title">◈ COMO FUNCIONA</div>
    <div class="px-steps">
      <div class="px-step"><div class="px-step-n">1</div><div><strong>Escolha o veículo</strong><br>Filtre por datas e veja preços reais com taxa de serviço já incluída</div></div>
      <div class="px-step"><div class="px-step-n">2</div><div><strong>Solicite a reserva</strong><br>O anfitrião confirma (ou ative reserva instantânea)</div></div>
      <div class="px-step"><div class="px-step-n">3</div><div><strong>Pague com segurança</strong><br>PIX via Mercado Pago, liberado ao anfitrião após a devolução</div></div>
      <div class="px-step"><div class="px-step-n">4</div><div><strong>Aproveite</strong><br>Retire no local combinado e devolva na data acordada</div></div>
    </div>
  </div>

  <!-- BENEFÍCIOS -->
  <div class="px-card">
    <div class="px-card-title">◈ INCLUÍDO EM TODA RESERVA</div>
    <div class="px-benefits">
      <div class="px-benefit">✅ Seguro via plano do anfitrião</div>
      <div class="px-benefit">✅ Assistência 24h MOBYA</div>
      <div class="px-benefit">✅ Pagamento protegido</div>
      <div class="px-benefit">✅ Cancelamento gratuito</div>
      <div class="px-benefit">✅ Suporte via app</div>
      <div class="px-benefit">✅ Sem taxa de adesão</div>
    </div>
  </div>

</div>`;

    // Ajuste dinâmico do min da data de devolução ao trocar retirada
    document.getElementById('aluguelIn')?.addEventListener('change', function() {
      const out = document.getElementById('aluguelOut');
      if (!out) return;
      const minOut = new Date(this.value);
      minOut.setDate(minOut.getDate()+1);
      const minStr = minOut.toISOString().split('T')[0];
      out.min = minStr;
      if (out.value <= this.value) out.value = minStr;
    });
  }

  // ── CARD DE VEÍCULO ─────────────────────────────────────────
  function _configCard(cfg, dias) {
    const L = cfg.listing || {};
    const images = Array.isArray(L.images) ? L.images : (typeof L.images === 'string' ? JSON.parse(L.images||'[]') : []);
    const thumb = images[0] || null;
    const city = L.city ? `📍 ${esc(L.city)}${L.state?', '+esc(L.state):''}` : '';
    const plan = {BASIC:'Básico',STANDARD:'Padrão',PREMIUM:'Premium',PREMIER:'Premier'}[cfg.protectionPlan] || cfg.protectionPlan;
    const totalBRL = fmtBRL(cfg.dailyRate * dias);
    const diariaBRL = fmtBRL(cfg.dailyRate);
    const instantBadge = cfg.instantBook
      ? `<span style="font-size:.62rem;padding:2px 8px;border-radius:4px;background:rgba(16,185,129,.15);color:var(--green);border:1px solid rgba(16,185,129,.3);font-family:'JetBrains Mono',monospace">⚡ Instantânea</span>`
      : `<span style="font-size:.62rem;padding:2px 8px;border-radius:4px;background:rgba(251,191,36,.12);color:var(--gold);border:1px solid rgba(251,191,36,.3);font-family:'JetBrains Mono',monospace">⏳ Aguarda confirmação</span>`;

    return `<div class="px-rental-card" style="background:var(--s2);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:border-color .2s;margin-bottom:14px" onmouseover="this.style.borderColor='rgba(0,245,255,.3)'" onmouseout="this.style.borderColor='var(--border)'">
      ${thumb ? `<img src="${esc(thumb)}" style="width:100%;height:160px;object-fit:cover" onerror="this.style.display='none'">` : `<div style="width:100%;height:120px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:3rem">🚗</div>`}
      <div style="padding:16px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:.92rem;color:var(--text);line-height:1.3">${esc(L.title||'Veículo')}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:3px">${city}</div>
          </div>
          ${instantBadge}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
          <div style="background:var(--s3);border-radius:8px;padding:9px;text-align:center">
            <div style="font-size:.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:3px">DIÁRIA</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;color:var(--neon)">${diariaBRL}</div>
          </div>
          <div style="background:var(--s3);border-radius:8px;padding:9px;text-align:center">
            <div style="font-size:.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:3px">TOTAL (${dias}d)</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1rem;color:var(--gold)">${totalBRL}</div>
          </div>
          <div style="background:var(--s3);border-radius:8px;padding:9px;text-align:center">
            <div style="font-size:.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:3px">PLANO</div>
            <div style="font-size:.78rem;font-weight:600;color:var(--text)">${esc(plan)}</div>
          </div>
        </div>
        <div style="font-size:.72rem;color:var(--muted);margin-bottom:12px">
          Min. ${cfg.minRentalDays||1} dia(s) · Depósito: ${cfg.deposit ? fmtBRL(cfg.deposit) : 'Sem depósito'} · ${cfg.includedKmPerDay||200} km/dia incluídos
        </div>
        <button onclick="PagesExtra.abrirDetalhes('${esc(cfg.id)}', document.getElementById('aluguelIn').value, document.getElementById('aluguelOut').value)" style="width:100%;padding:12px;background:linear-gradient(135deg,var(--neon),#00b894);border:none;border-radius:10px;font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:2px;cursor:pointer;color:#000;font-weight:700">VER DETALHES E RESERVAR</button>
      </div>
    </div>`;
  }

  // ── GEOLOCALIZAÇÃO (best-effort) ────────────────────────────
  function _getCoords() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000 }
      );
    });
  }

  // ── AÇÕES ──────────────────────────────────────────────────
  const PagesExtra = {

    // ── BUSCA REAL DE CONFIGS DE ALUGUEL ────────────────────
    // GET /rental/configs/available?startDate=...&endDate=...&limit=20
    // Fallback: GET /rental/configs/mine (lista geral)
    async buscarVeiculos() {
      const startDate = document.getElementById('aluguelIn')?.value;
      const endDate   = document.getElementById('aluguelOut')?.value;
      if (!startDate || !endDate || startDate >= endDate) {
        window.App?.toast('Selecione datas válidas (devolução deve ser depois da retirada).','warn');
        return;
      }
      const dias = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000));
      const frota = document.getElementById('aluguelFrota');
      const count = document.getElementById('aluguelCount');
      if (!frota) return;

      frota.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)"><div style="font-size:1.5rem;margin-bottom:10px">⟳</div><div style="font-family:'JetBrains Mono',monospace;font-size:.75rem">Buscando veículos disponíveis...</div></div>`;
      if (count) count.textContent = '';

      try {
        // Endpoint principal: configs disponíveis no período
        const params = new URLSearchParams({ startDate, endDate, limit: 20 });
        let configs = [];
        try {
          const r = await API.req('GET', `/rental/configs/available?${params}`);
          configs = r?.data?.configs || r?.data || [];
        } catch (_) {
          // Se o endpoint /available não existir ainda, busca geral como fallback
          const r2 = await API.req('GET', '/rental/configs?active=true&limit=20');
          configs = r2?.data?.configs || r2?.data || [];
        }

        if (count) count.textContent = configs.length > 0 ? `${configs.length} veículo(s) encontrado(s)` : '';

        if (!configs.length) {
          frota.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--muted)">
              <div style="font-size:2.5rem;margin-bottom:12px">🗝️</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:.78rem;margin-bottom:16px">Nenhum veículo disponível para este período.</div>
              <div style="font-size:.76rem;color:var(--muted);margin-bottom:16px">Tente outras datas ou cadastre seu veículo e lucre!</div>
              <button onclick="App.navigate('painel-anfitriao')" style="background:linear-gradient(135deg,var(--green),#059669);color:#fff;border:none;border-radius:8px;padding:10px 22px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">🏠 Cadastrar meu veículo</button>
            </div>`;
          return;
        }

        frota.innerHTML = configs.map(c => _configCard(c, dias)).join('');

      } catch(e) {
        frota.innerHTML = `
          <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:24px;text-align:center">
            <div style="font-size:1.5rem;margin-bottom:8px">⚠️</div>
            <div style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:.8rem">${esc(e?.message||'Erro ao buscar veículos')}</div>
            <button onclick="PagesExtra.buscarVeiculos()" style="margin-top:16px;background:var(--s2);border:1px solid var(--border);color:var(--neon);border-radius:8px;padding:8px 18px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:.72rem">↺ Tentar novamente</button>
          </div>`;
      }
    },

    // ── MODAL DE DETALHES COM PREVIEW DE PREÇO REAL ──────────
    async abrirDetalhes(configId, startDate, endDate) {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin('aluguel'); return; }
      document.getElementById('rentalDetailModal')?.remove();

      const overlay = document.createElement('div');
      overlay.id = 'rentalDetailModal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9998;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)';
      overlay.innerHTML = '<div style="width:100%;max-width:560px;max-height:90vh;overflow-y:auto;background:var(--surface,#1a1a2e);border-radius:20px 20px 0 0;padding:20px"><div style="text-align:center;padding:30px;color:var(--muted)">⟳ Carregando...</div></div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });

      try {
        const [rConfig, rPreview] = await Promise.all([
          API.req('GET', '/rental/configs/' + configId),
          (startDate && endDate)
            ? API.req('GET', `/rental/preview-price?configId=${configId}&startDate=${startDate}&endDate=${endDate}`).catch(()=>null)
            : Promise.resolve(null),
        ]);

        const c = rConfig.data;
        const L = c.listing || {};
        const preview = rPreview?.data || null;
        const images = Array.isArray(L.images) ? L.images : (typeof L.images === 'string' ? JSON.parse(L.images||'[]') : []);

        const dias = (startDate && endDate)
          ? Math.max(1, Math.round((new Date(endDate)-new Date(startDate))/86400000))
          : (c.minRentalDays || 1);

        const photoHtml = images.length
          ? `<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:16px;padding-bottom:4px">${images.slice(0,5).map(p=>`<img src="${esc(p)}" style="height:140px;border-radius:10px;object-fit:cover;flex-shrink:0;max-width:220px" onerror="this.style.display='none'">`).join('')}</div>`
          : `<div style="width:100%;height:100px;background:var(--s3,#0d0d1a);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:3rem;margin-bottom:16px">🚗</div>`;

        // Preços: prioriza preview real, fallback para estimativa local
        const subtotal   = preview?.subtotal   ?? (c.dailyRate * dias);
        const totalLoc   = preview?.renterTotalAmount ?? subtotal;
        const svcFee     = preview?.renterServiceFeeAmount ?? 0;
        const hostPayout = preview?.hostPayoutAmount ?? subtotal;
        const plan = {BASIC:'Básico',STANDARD:'Padrão',PREMIUM:'Premium',PREMIER:'Premier'}[c.protectionPlan] || c.protectionPlan;

        const inner = overlay.querySelector('div');
        inner.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;color:var(--text)">${esc(L.title||'Veículo')}</div>
            <button onclick="document.getElementById('rentalDetailModal')?.remove()" style="background:none;border:none;color:var(--muted);font-size:1.4rem;cursor:pointer;padding:4px 8px">✕</button>
          </div>
          ${photoHtml}
          ${L.description?`<div style="font-size:.84rem;color:var(--muted);line-height:1.5;margin-bottom:16px;background:var(--s2,#0d0d1a);border-radius:10px;padding:12px">${esc(L.description.slice(0,400))}${L.description.length>400?'…':''}</div>`:''}

          <!-- GRID DE PREÇO -->
          <div style="background:var(--s2,#0d0d1a);border-radius:12px;padding:14px;margin-bottom:14px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--muted);letter-spacing:1px;margin-bottom:10px">RESUMO DO PREÇO</div>
            <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:6px"><span style="color:var(--muted)">Diária × ${dias} dias</span><span>${fmtBRL(subtotal)}</span></div>
            ${svcFee>0?`<div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:6px"><span style="color:var(--muted)">Taxa de serviço</span><span>${fmtBRL(svcFee)}</span></div>`:''}
            <div style="border-top:1px solid var(--border,rgba(255,255,255,.08));margin:10px 0 8px"></div>
            <div style="display:flex;justify-content:space-between;font-size:.95rem;font-weight:700"><span>Total</span><span style="color:var(--gold)">${fmtBRL(totalLoc)}</span></div>
            ${preview?'':'<div style="font-size:.68rem;color:var(--muted);margin-top:6px;font-family:\'JetBrains Mono\',monospace">* Estimativa. Taxa de serviço calculada na confirmação.</div>'}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
            <div style="background:var(--s2,#0d0d1a);border-radius:10px;padding:12px">
              <div style="font-size:.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:3px">DEPÓSITO</div>
              <div style="font-size:.88rem;font-weight:600">${c.deposit?fmtBRL(c.deposit):'Sem depósito'}</div>
            </div>
            <div style="background:var(--s2,#0d0d1a);border-radius:10px;padding:12px">
              <div style="font-size:.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:3px">RETIRADA</div>
              <div style="font-size:.84rem">${esc(c.pickupAddress||L.city||'—')}</div>
            </div>
            <div style="background:var(--s2,#0d0d1a);border-radius:10px;padding:12px">
              <div style="font-size:.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:3px">PLANO PROTEÇÃO</div>
              <div style="font-size:.84rem;font-weight:600">${esc(plan)}</div>
            </div>
            <div style="background:var(--s2,#0d0d1a);border-radius:10px;padding:12px">
              <div style="font-size:.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:3px">KM INCLUÍDOS</div>
              <div style="font-size:.84rem">${c.includedKmPerDay||200} km/dia</div>
            </div>
          </div>

          <div style="font-size:.74rem;color:var(--muted);margin-bottom:6px">
            Min. ${c.minRentalDays||1} dia(s) · Máx. ${c.maxRentalDays||30} dia(s) · Aviso: ${c.advanceNoticeHrs||2}h de antecedência
          </div>
          <div style="font-size:.74rem;color:var(--muted);margin-bottom:16px">
            Anfitrião: <strong style="color:var(--text)">${esc(c.host?.name||'—')}</strong>
            &nbsp;·&nbsp; ${c.instantBook?'⚡ Aprovação imediata':'⏳ Aguarda confirmação'}
          </div>

          <button id="btnConfirmarReserva" onclick="PagesExtra.confirmarReserva('${esc(c.id)}','${startDate||''}','${endDate||''}')" style="width:100%;padding:14px;background:linear-gradient(135deg,var(--neon,#00ff88),#00b894);border:none;border-radius:12px;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:2px;cursor:pointer;color:#000;font-weight:700">
            🗝️ RESERVAR — ${fmtBRL(totalLoc)}
          </button>
        `;
      } catch(e) {
        overlay.querySelector('div').innerHTML = `
          <div style="padding:32px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
            <div style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:.82rem">Erro: ${esc(e?.message||'Falha ao carregar detalhes')}</div>
            <button onclick="document.getElementById('rentalDetailModal')?.remove()" style="margin-top:16px;background:var(--s2);border:1px solid var(--border);color:var(--neon);border-radius:8px;padding:8px 18px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:.72rem">Fechar</button>
          </div>`;
      }
    },

    // ── CONFIRMA RESERVA ─────────────────────────────────────
    async confirmarReserva(configId, startDate, endDate) {
      const btn = document.getElementById('btnConfirmarReserva');
      if (btn) { btn.disabled=true; btn.textContent='Enviando...'; }

      const i = startDate || document.getElementById('aluguelIn')?.value;
      const o = endDate   || document.getElementById('aluguelOut')?.value;
      if (!i||!o) { window.App?.toast('Selecione as datas','warn'); if(btn){btn.disabled=false;btn.textContent='RESERVAR AGORA';} return; }

      try {
        await API.req('POST', '/rental/bookings', { configId, startDate: i, endDate: o });
        document.getElementById('rentalDetailModal')?.remove();
        window.App?.toast('🎉 Reserva solicitada com sucesso!','ok');
        window.App?.navigate('minhas-reservas');
      } catch(e) {
        window.App?.toast(e?.message||'Erro ao criar reserva','err');
        if(btn){ btn.disabled=false; btn.textContent='🗝️ RESERVAR'; }
      }
    },

    // ── AÇÕES DE EMERGÊNCIA ──────────────────────────────────
    async solicitarReboque() {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      try {
        window.App?.toast('📍 Localizando e acionando motorista...','info');
        const coords = await _getCoords();
        const r = await API.emergency.create({ type: 'TOW', description: 'Solicitação de reboque via app MOBYA', ...coords });
        window.App?.toast('🚛 ' + (r.message || 'Motorista acionado! Acompanhe em tempo real.'), 'ok');
        window.__mobyaPendingEmergencyId = r.data?.id || null;
        window.App?.navigate('ultra-gps');
      } catch (e) {
        window.App?.toast(e?.message || 'Não foi possível acionar o reboque agora.', 'err');
      }
    },
    async solicitarChaveiro() {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      try {
        window.App?.toast('📍 Localizando técnico mais próximo...','info');
        const coords = await _getCoords();
        const r = await API.emergency.create({ type: 'LOCKSMITH', description: 'Solicitação de chaveiro via app MOBYA', ...coords });
        window.App?.toast('🔑 ' + (r.message || 'Técnico acionado!'), 'ok');
        window.__mobyaPendingEmergencyId = r.data?.id || null;
        window.App?.navigate('ultra-gps');
      } catch (e) {
        window.App?.toast(e?.message || 'Não foi possível acionar o chaveiro agora.', 'err');
      }
    },
    async solicitarFrete() {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      try {
        window.App?.toast('📍 Localizando e acionando transportador...','info');
        const coords = await _getCoords();
        const r = await API.emergency.create({ type: 'FREIGHT', description: 'Solicitação de frete via app MOBYA', ...coords });
        window.App?.toast('🚚 ' + (r.message || 'Transportador acionado!'), 'ok');
        window.__mobyaPendingEmergencyId = r.data?.id || null;
        window.App?.navigate('ultra-gps');
      } catch (e) {
        window.App?.toast(e?.message || 'Não foi possível acionar o frete agora.', 'err');
      }
    },
    async solicitarMecanico() {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      try {
        window.App?.toast('📍 Localizando mecânico mais próximo...','info');
        const coords = await _getCoords();
        const r = await API.emergency.create({ type: 'MECHANIC', description: 'Solicitação de mecânico de emergência via app MOBYA', ...coords });
        window.App?.toast('🔧 ' + (r.message || 'Mecânico acionado!'), 'ok');
        window.__mobyaPendingEmergencyId = r.data?.id || null;
        window.App?.navigate('ultra-gps');
      } catch (e) {
        window.App?.toast(e?.message || 'Não foi possível acionar o mecânico agora.', 'err');
      }
    },

    // alias legado mantido para compatibilidade
    reservarCarro(nome, providerId, dias) {
      if (providerId) PagesExtra.abrirDetalhes(providerId);
    },
  };

  window.PagesExtra = PagesExtra;
  PagesExtra.renderReboque  = renderReboque;
  PagesExtra.renderChaveiro = renderChaveiro;
  PagesExtra.renderAluguel  = renderAluguel;
  PagesExtra.renderFrete    = renderFrete;
  PagesExtra.renderMecanico = renderMecanico;
  PagesExtra.runDiagnose    = runDiagnose;
  PagesExtra.abrirDetalhes    = PagesExtra.abrirDetalhes;
  PagesExtra.confirmarReserva = PagesExtra.confirmarReserva;

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
.px-rental-card img{display:block}
@media(max-width:480px){.px-form-row{grid-template-columns:1fr}.px-grid2{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

})();
