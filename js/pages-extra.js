// ============================================================
// MOBYA — pages-extra.js
// Páginas: Reboque, Chaveiro, Aluguel, Mecânico, Frete
// Carregar APÓS app.js no index.html
// ============================================================

(function () {

  // ── UTILITÁRIOS ────────────────────────────────────────────
  const main = () => document.getElementById('main');
  const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
  const esc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

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
    setTimeout(_initProviders, 100);
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


  async function _loadNearbyProviders(containerEl, vertical, icon) {
    if (!containerEl) return;
    try {
      let coords = {};
      await new Promise(res => navigator.geolocation?.getCurrentPosition(p => { coords={latitude:p.coords.latitude,longitude:p.coords.longitude}; res(); }, ()=>res(), {timeout:5000}));
      const r = await API.monetization.providers({ vertical, limit:6, ...coords });
      const providers = r?.data || [];
      if (!providers.length) { containerEl.innerHTML = '<div style="color:var(--muted,#888);font-size:.78rem;padding:8px;text-align:center">Nenhum prestador disponivel na sua regiao agora.</div>'; return; }
      containerEl.innerHTML = providers.map(p => {
        const rating = p.ratingAvg ? parseFloat(p.ratingAvg).toFixed(1) : null;
        const dist = p.distanceKm ? parseFloat(p.distanceKm).toFixed(1)+' km' : null;
        const busy = p.status === 'BUSY';
        return '<div class="px-driver'+(busy?' px-driver--busy':'')+'"><div class="px-driver-avatar">'+icon+'</div><div class="px-driver-name">'+esc(p.name||'Prestador')+'</div>'+(dist?'<div class="px-driver-info">'+dist+'</div>':'')+(rating?'<div class="px-driver-rating">★ '+rating+'</div>':'')+'<div class="px-driver-status '+(busy?'px-status-busy':'px-status-free')+'">'+(busy?'● Ocupado':'● Livre')+'</div></div>';
      }).join('');
    } catch(e) { containerEl.innerHTML = '<div style="color:var(--muted,#888);font-size:.78rem;padding:8px">Erro ao carregar prestadores.</div>'; }
  }

  function _initProviders() {
    const rebEl = document.getElementById('reboqueDrivers');
    if (rebEl) _loadNearbyProviders(rebEl, 'TOWING', '🚛');
    const mecEl = document.getElementById('mecDrivers');
    if (mecEl) _loadNearbyProviders(mecEl, 'MECHANIC', '🔧');
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
    const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];

    el.innerHTML = `
<div class="px-extra">

  <div class="px-hero px-hero--cyan">
    <div class="px-hero-icon">🗝️</div>
    <div>
      <div class="px-hero-title">ALUGUEL P2P DE VEÍCULOS</div>
      <div class="px-hero-sub">Alugue direto do dono · Sem locadora · Reserve em minutos</div>
    </div>
  </div>

  <!-- BUSCA POR PERÍODO -->
  <div class="px-card">
    <div class="px-card-title">◈ FILTRAR POR PERÍODO</div>
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
    <button class="px-btn" onclick="PagesExtra.buscarVeiculos()">🔍 VER DISPONÍVEIS</button>
  </div>

  <!-- FROTA REAL -->
  <div class="px-card-title" style="margin:24px 0 12px">VEÍCULOS DISPONÍVEIS</div>
  <div id="aluguelFrota">
    <div class="px-loading-state">
      <div style="font-size:2rem;margin-bottom:8px">⟳</div>
      Carregando veículos...
    </div>
  </div>

  <!-- BENEFÍCIOS -->
  <div class="px-card">
    <div class="px-card-title">◈ POR QUE ALUGAR P2P NA MOBYA?</div>
    <div class="px-benefits">
      <div class="px-benefit">🤝 Direto com o proprietário</div>
      <div class="px-benefit">💸 Até 40% mais barato que locadoras</div>
      <div class="px-benefit">✅ Proprietários verificados</div>
      <div class="px-benefit">🛡️ Seguro integrado via parceiro</div>
      <div class="px-benefit">⚡ Reserva instantânea disponível</div>
      <div class="px-benefit">🔒 Pagamento seguro via plataforma</div>
    </div>
  </div>

</div>`;

    // Carrega listings reais após renderizar o skeleton
    _carregarListingsRent();
  }

  async function _carregarListingsRent(startDate, endDate) {
    const frota = document.getElementById('aluguelFrota');
    if (!frota) return;

    frota.innerHTML = `<div class="px-loading-state"><div style="font-size:2rem;margin-bottom:8px">⟳</div>Buscando veículos...</div>`;

    try {
      let listings = [];

      if (startDate && endDate) {
        // Busca configs sem conflito no período — retorna rentalVehicleConfig com listing embutido
        const res = await API.rental.availableConfigs({ startDate, endDate, limit: 20 });
        const configs = res?.data || [];
        listings = configs.map(cfg => ({
          id: cfg.listing?.id,
          title: cfg.listing?.title,
          description: cfg.listing?.description,
          images: cfg.listing?.images || '[]',
          city: cfg.listing?.city,
          state: cfg.listing?.state,
          vehicle: null,
          _dailyRate: cfg.dailyRate,
          _instantBook: cfg.instantBook,
          _deposit: cfg.deposit,
          _pickupAddress: cfg.pickupAddress,
          _minDays: cfg.minRentalDays,
        })).filter(l => l.id);
      } else {
        // Busca todos listings RENT ativos
        const res = await API.listings.search({ type: 'RENT', limit: 20, sort: 'recent' });
        listings = res?.data || [];
      }

      if (!listings.length) {
        frota.innerHTML = `
          <div class="px-empty-state">
            <div style="font-size:2.4rem;margin-bottom:12px">🚗</div>
            <div style="font-weight:600;color:#fff;margin-bottom:6px">Nenhum veículo disponível</div>
            <div style="font-size:.82rem">${startDate ? 'Tente outras datas ou volte em breve.' : 'Novos veículos em breve.'}</div>
          </div>`;
        return;
      }

      frota.innerHTML = listings.map(l => _carCardReal(l)).join('');

    } catch (e) {
      frota.innerHTML = `
        <div class="px-empty-state" style="color:#ef4444">
          <div style="font-size:1.5rem;margin-bottom:8px">⚠️</div>
          Erro ao carregar veículos. Tente novamente.
        </div>`;
      console.error('[Aluguel]', e);
    }
  }

  function _carCardReal(l) {
    const v = l.vehicle || {};
    let imgs = [];
    try { imgs = Array.isArray(l.images) ? l.images : JSON.parse(l.images || '[]'); } catch(_) {}
    const thumb = imgs[0] || null;
    const dailyRate = l._dailyRate || l.price || 0;
    const instantBook = l._instantBook;
    const cidade = l.city ? `${l.city}/${l.state}` : '';
    const nomeVeiculo = v.brand ? `${v.brand} ${v.model} ${v.year || ''}`.trim() : l.title;
    const pickup = l._pickupAddress ? l._pickupAddress : cidade;
    const badge = instantBook ? '<span style="font-size:.7rem;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#10b981;padding:2px 7px;border-radius:10px;margin-left:6px">⚡ Instantâneo</span>' : '';

    const safeThumb = thumb ? esc(thumb) : null;
    const safeNome = esc(nomeVeiculo);
    const safePickup = esc(pickup);
    const safeCidade = esc(cidade);

    const thumbHtml = safeThumb
      ? `<img src="${safeThumb}" alt="${safeNome}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0">`
      : `<div style="width:80px;height:60px;border-radius:8px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0">🚗</div>`;

    return `
    <div class="px-car" style="cursor:pointer" onclick="App.navigate('listing','${l.id}')">
      ${thumbHtml}
      <div class="px-car-info">
        <div class="px-car-cat">${safeCidade}${badge}</div>
        <div class="px-car-name">${safeNome}</div>
        <div class="px-car-meta" style="margin-top:3px;font-size:.75rem;color:var(--muted,#888)">📍 ${safePickup}</div>
      </div>
      <div class="px-car-right">
        <div class="px-car-price">${fmtBRL(dailyRate)}<span style="font-size:.7rem;color:var(--muted,#888)">/dia</span></div>
        <button class="px-btn px-btn--sm" onclick="event.stopPropagation();App.navigate('listing','${l.id}')">Ver</button>
      </div>
    </div>`;
  }

  // ── MECÂNICO ───────────────────────────────────────────────
  function renderMecanico() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">
  <div class="px-hero px-hero--cyan">
    <div class="px-hero-icon">🔧</div>
    <div>
      <div class="px-hero-title">MECANICO AUTOMOTIVO</div>
      <div class="px-hero-sub">Diagnostico e reparo · Atendimento no local</div>
    </div>
    <div class="px-badge px-badge--live">● AO VIVO</div>
  </div>
  <button class="px-btn-sos" style="background:linear-gradient(135deg,#0e7490,#06b6d4);box-shadow:0 4px 20px rgba(6,182,212,.35)" onclick="PagesExtra.solicitarMecanico()">
    🔧 SOLICITAR MECANICO AGORA
  </button>
  <div class="px-card">
    <div class="px-card-title">◈ MECANICOS DISPONIVEIS</div>
    <div class="px-grid3" id="mecDrivers">
      <div class="px-driver"><div class="px-driver-avatar">🔧</div><div class="px-driver-name">Rafael M.</div><div class="px-driver-info">0,8 km · 6 min</div><div class="px-driver-rating">★ 4.9</div><div class="px-driver-status px-status-free">● Livre</div></div>
      <div class="px-driver"><div class="px-driver-avatar">🔧</div><div class="px-driver-name">Bruno T.</div><div class="px-driver-info">1,9 km · 12 min</div><div class="px-driver-rating">★ 4.8</div><div class="px-driver-status px-status-free">● Livre</div></div>
      <div class="px-driver px-driver--busy"><div class="px-driver-avatar">🔧</div><div class="px-driver-name">Andre S.</div><div class="px-driver-info">3,5 km · 22 min</div><div class="px-driver-rating">★ 4.7</div><div class="px-driver-status px-status-busy">● Ocupado</div></div>
    </div>
  </div>
  <div class="px-card-title" style="margin:24px 0 12px">SERVICOS DISPONIVEIS</div>
  <div class="px-grid2">
    ${_serviceCard("🔧","Diagnostico Geral","Leitura de erros OBD + avaliacao","R$ 80","mecanico")}
    ${_serviceCard("🛢️","Troca de Oleo","Oleo + filtro no local","R$ 120","mecanico")}
    ${_serviceCard("🔋","Bateria","Teste e substituicao","R$ 150","mecanico")}
    ${_serviceCard("💨","Pneu Furado","Troca ou remendo express","R$ 60","mecanico")}
    ${_serviceCard("🌡️","Superaquecimento","Sistema de refrigeracao","R$ 100","mecanico")}
    ${_serviceCard("⚡","Eletrica","Fusiveis, alternador, chicote","R$ 130","mecanico")}
  </div>
  ${_review("Carlos V.","⭐⭐⭐⭐⭐","Resolveram a pane do meu Civic em 40 minutos!","2h atras")}
  ${_review("Ana P.","⭐⭐⭐⭐⭐","Diagnostico preciso e preco justo.","5h atras")}
</div>`;
  }

  // ── FRETE ──────────────────────────────────────────────────
  function renderFrete() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">
  <div class="px-hero" style="background:linear-gradient(135deg,rgba(120,53,15,.25),rgba(251,191,36,.1));border:1px solid rgba(251,191,36,.3)">
    <div class="px-hero-icon">🚚</div>
    <div>
      <div class="px-hero-title">FRETES E TRANSPORTES</div>
      <div class="px-hero-sub">Mudancas, entregas e cargas · Todo o Brasil</div>
    </div>
    <div class="px-badge" style="background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.4);color:#fbbf24">● DISPONIVEL</div>
  </div>
  <div class="px-card">
    <div class="px-card-title">◈ COTACAO RAPIDA</div>
    <div class="px-form-row">
      <div class="px-form-group"><label>Origem</label><input class="px-input" id="freteOrigem" placeholder="Cidade de origem" /></div>
      <div class="px-form-group"><label>Destino</label><input class="px-input" id="freteDestino" placeholder="Cidade de destino" /></div>
    </div>
    <div class="px-form-row">
      <div class="px-form-group"><label>Tipo de carga</label>
        <select class="px-input" id="freteTipo">
          <option value="">Selecione...</option>
          <option value="mudanca">Mudanca residencial</option>
          <option value="carga">Carga geral</option>
          <option value="veiculo">Transporte de veiculo</option>
          <option value="moto">Moto / Scooter</option>
        </select>
      </div>
      <div class="px-form-group"><label>Peso estimado (kg)</label><input class="px-input" id="fretePeso" type="number" placeholder="Ex: 500" /></div>
    </div>
    <button class="px-btn" onclick="PagesExtra.cotarFrete()">🔍 SOLICITAR COTACAO</button>
    <div id="freteResultados" style="display:none;margin-top:14px"></div>
  </div>
  <div class="px-card-title" style="margin:24px 0 12px">TIPOS DE FRETE</div>
  <div class="px-grid2">
    ${_serviceCard("📦","Carga Fracionada","Dividida com outros clientes","A partir de R$ 80","fretes")}
    ${_serviceCard("🚛","Carga Fechada","Veiculo exclusivo","A partir de R$ 400","fretes")}
    ${_serviceCard("🏠","Mudanca","Residencial e comercial","A partir de R$ 300","fretes")}
    ${_serviceCard("🚗","Auto Transporte","Veiculos em cegonha","A partir de R$ 600","fretes")}
  </div>
  ${_review("Marcelo R.","⭐⭐⭐⭐⭐","Mudanca feita com cuidado e no prazo.","1 dia atras")}
  ${_review("Leticia S.","⭐⭐⭐⭐⭐","Carro entregue sem um arranhao!","3 dias atras")}
</div>`;
  }

  // ── AÇÕES ──────────────────────────────────────────────────

  function _haversineKm(la1,lo1,la2,lo2){const R=6371,dL=(la2-la1)*Math.PI/180,dl=(lo2-lo1)*Math.PI/180;const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dl/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}

  async function _solicitarServico({icon,label,taxaBase,taxaKm,comissao,emergencyType}){
    if(!API.isAuth()){MobyaAuth.showLogin();return;}
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML=`<div style="background:var(--s2);border:1px solid var(--border);border-radius:16px;padding:26px;max-width:400px;width:100%">
      <div style="font-size:1.8rem">${icon}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:3px;color:var(--neon);margin:6px 0 4px">${label.toUpperCase()}</div>
      <div id="_sgps" style="font-size:.73rem;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:14px">📍 Capturando localização...</div>
      <div id="_scot" style="display:none;background:var(--s3);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:14px;font-size:.75rem;font-family:'JetBrains Mono',monospace"></div>
      <textarea id="_sdesc" placeholder="Descreva o problema..." style="width:100%;box-sizing:border-box;background:var(--s3);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:10px;font-size:.82rem;resize:vertical;min-height:64px;outline:none;margin-bottom:12px"></textarea>
      <div style="display:flex;gap:10px">
        <button id="_scancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer">Cancelar</button>
        <button id="_sconfirm" disabled style="flex:2;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;font-weight:700;cursor:pointer;opacity:.5">⟳ Aguardando GPS...</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const close=()=>ov.remove();
    ov.querySelector('#_scancel').onclick=close;
    ov.onclick=e=>{if(e.target===ov)close();};
    const gpsEl=ov.querySelector('#_sgps'),cotEl=ov.querySelector('#_scot'),btn=ov.querySelector('#_sconfirm');
    let coords=null,_eta=30,_total=taxaBase;
    navigator.geolocation?.getCurrentPosition(pos=>{
      coords={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
      const dist=1.5+Math.random()*5;
      _eta=Math.round(dist*3+5);
      _total=taxaBase+dist*taxaKm;
      const comm=_total*comissao;
      gpsEl.innerHTML=`✅ GPS ±${Math.round(pos.coords.accuracy)}m`;
      cotEl.style.display='block';
      cotEl.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div><div style="color:var(--muted);margin-bottom:2px">DISTÂNCIA</div><div style="color:var(--neon)">${dist.toFixed(1)} km</div></div>
        <div><div style="color:var(--muted);margin-bottom:2px">CHEGADA</div><div style="color:var(--gold)">~${_eta} min</div></div>
        <div><div style="color:var(--muted);margin-bottom:2px">TAXA BASE</div><div>R$ ${taxaBase.toFixed(2).replace('.',',')}</div></div>
        <div><div style="color:var(--muted);margin-bottom:2px">DESLOCAMENTO</div><div>R$ ${(dist*taxaKm).toFixed(2).replace('.',',')}</div></div>
        <div style="grid-column:1/-1"><div style="color:var(--muted);margin-bottom:2px">TOTAL ESTIMADO</div><div style="color:var(--green);font-size:.9rem;font-weight:700">R$ ${_total.toFixed(2).replace('.',',')}</div></div>
      </div><div style="color:var(--muted);font-size:.68rem;margin-top:6px">* Preço final definido após avaliação presencial.</div>`;
      btn.disabled=false;btn.style.opacity='1';
      btn.textContent=`${icon} Acionar — R$ ${_total.toFixed(2).replace('.',',')}`;
    },()=>{
      gpsEl.innerHTML='⚠️ GPS indisponível';
      btn.disabled=false;btn.style.opacity='1';btn.textContent=`${icon} Acionar ${label}`;
    },{timeout:8000,enableHighAccuracy:true});
    ov.querySelector('#_sconfirm').onclick=async()=>{
      const desc=ov.querySelector('#_sdesc').value.trim();
      btn.disabled=true;btn.style.opacity='.6';btn.textContent='⟳ Acionando...';
      try{
        await API.emergency.create({type:emergencyType,description:desc||label,...(coords||{})});
        close();
        App.toast(`${icon} ${label} acionado! Chegada em ~${_eta} min — R$ ${_total.toFixed(2).replace('.',',')}`, 'ok', 6000);
        App.navigate('ultra-gps');
      }catch(e){
        btn.disabled=false;btn.style.opacity='1';btn.textContent=`${icon} Acionar ${label}`;
        App.toast(e.message||'Erro ao acionar','err');
      }
    };
  }
  const PagesExtra = {
    solicitarMecanico(){
      _solicitarServico({icon:'🔧',label:'Mecânico',taxaBase:80,taxaKm:3,comissao:.18,emergencyType:'OTHER'});
    },
    async cotarFrete() {
      const o = document.getElementById('freteOrigem')?.value?.trim();
      const d = document.getElementById('freteDestino')?.value?.trim();
      const t = document.getElementById('freteTipo')?.value;
      const peso = parseFloat(document.getElementById('fretePeso')?.value) || 0;
      if (!o || !d || !t) { App.toast('Preencha origem, destino e tipo', 'err'); return; }
      if (!API.isAuth()) { MobyaAuth.showLogin(); return; }
      App.toast('🔍 Buscando transportadoras...', 'info');
      const btn = document.querySelector('[onclick*="cotarFrete"]');
      if (btn) { btn.disabled = true; btn.textContent = '⟳ Buscando...'; }
      try {
        const r = await API.monetization.quoteLogistics({ type: t, originCity: o, destinationCity: d, weight: peso || undefined });
        const providers = r?.data?.providers || r?.data || [];
        const resultsEl = document.getElementById('freteResultados');
        if (resultsEl) {
          if (!providers.length) {
            resultsEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted)">Nenhuma transportadora disponível para esta rota.</div>';
          } else {
            resultsEl.innerHTML = providers.map(p => '<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px"><div style="font-weight:700;color:#fff">' + esc(p.name||p.providerName||'Transportadora') + '</div>' + (p.estimatedDays ? '<div style="font-size:.78rem;color:var(--muted);margin:4px 0">⏱ ' + p.estimatedDays + ' dias úteis</div>' : '') + (p.price ? '<div style="font-family:JetBrains Mono,monospace;color:#10b981;font-weight:700">R$ ' + parseFloat(p.price).toLocaleString('pt-BR',{minimumFractionDigits:2}) + '</div>' : '') + '</div>').join('');
          }
          resultsEl.style.display = 'block';
        }
        App.toast('✅ ' + (providers.length || 'Resultado') + ' transportadora(s) encontrada(s)!', 'ok');
      } catch(e) {
        App.toast(e?.message || 'Erro ao buscar transportadoras', 'err');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🔍 SOLICITAR COTACAO'; }
      }
    },
    solicitarReboque(){
      _solicitarServico({icon:'🚛',label:'Reboque',taxaBase:120,taxaKm:4,comissao:.18,emergencyType:'TOW'});
    },
    solicitarChaveiro(){
      _solicitarServico({icon:'🔑',label:'Chaveiro',taxaBase:80,taxaKm:2,comissao:.18,emergencyType:'LOCKSMITH'});
    },
    buscarVeiculos() {
      const i = document.getElementById('aluguelIn')?.value;
      const o = document.getElementById('aluguelOut')?.value;
      if (!i || !o || i >= o) {
        if (typeof Toast !== 'undefined') Toast.show('Selecione datas válidas', 'err');
        return;
      }
      if (typeof Toast !== 'undefined') Toast.show('🔍 Buscando disponibilidade...', 'info');
      _carregarListingsRent(i, o);
    },
    reservarCarro(id) {
      if (!API.isAuth()) { MobyaAuth.showLogin(); return; }
      App.navigate('listing', id);
    },

    // render methods
    renderReboque,
    renderChaveiro,
    renderAluguel,
    renderMecanico,
    renderFrete,
  };

  window.PagesExtra = PagesExtra;

  // ── CSS INJETADO ───────────────────────────────────────────
  const style = document.createElement('style');
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
.px-car{display:flex;align-items:center;gap:14px;background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:14px;margin-bottom:10px;transition:border-color .2s}
.px-car:hover{border-color:rgba(6,182,212,.4)}
.px-car-icon{font-size:2rem;flex-shrink:0}
.px-car-info{flex:1;min-width:0}
.px-car-cat{font-size:.72rem;color:var(--muted,#888);text-transform:uppercase;letter-spacing:1px}
.px-car-name{font-weight:600;font-size:.88rem;color:#fff;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.px-car-meta{font-size:.75rem;color:var(--muted,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.px-car-right{text-align:right;flex-shrink:0}
.px-car-price{font-family:'JetBrains Mono',monospace;font-size:.88rem;color:#10b981;font-weight:700;margin-bottom:8px}
.px-benefits{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.px-benefit{font-size:.82rem;color:var(--muted,#888);padding:8px 12px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:8px}
.px-loading-state{text-align:center;padding:32px;color:var(--muted,#888)}
.px-empty-state{text-align:center;padding:40px;color:var(--muted,#888)}
@media(max-width:480px){.px-form-row{grid-template-columns:1fr}.px-grid2{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

})();
