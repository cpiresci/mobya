// ============================================================
// MOBYA — pages-monetize.js
// Páginas: Seguros e Financiamento
// Carregar APÓS pages-extra.js no index.html
// ============================================================

(function () {

  const main = () => document.getElementById('main');

  // ══════════════════════════════════════════════════════════
  // SEGUROS
  // ══════════════════════════════════════════════════════════
  function renderSeguros() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">

  <!-- HERO -->
  <div class="px-hero px-hero--green">
    <div class="px-hero-icon">🛡️</div>
    <div>
      <div class="px-hero-title">SEGUROS AUTOMOTIVOS</div>
      <div class="px-hero-sub">Compare e contrate em minutos · Melhor preço garantido</div>
    </div>
  </div>

  <!-- SIMULADOR -->
  <div class="px-card">
    <div class="px-card-title">◈ SIMULE SEU SEGURO</div>
    <div class="pm-form">
      <div class="pm-field">
        <label>Modelo do veículo</label>
        <input type="text" class="px-input" id="segVeiculo" placeholder="Ex: Toyota Corolla 2022">
      </div>
      <div class="pm-field">
        <label>Valor estimado do veículo</label>
        <input type="text" class="px-input" id="segValor" placeholder="R$ 0,00" oninput="PagesMon.fmtValorSeg(this)">
      </div>
      <div class="pm-field">
        <label>Idade do condutor</label>
        <input type="number" class="px-input" id="segIdade" placeholder="Ex: 32" min="18" max="99">
      </div>
      <div class="pm-field">
        <label>Ano</label>
        <select class="px-input" id="segAno">
          ${Array.from({length:15},(_,i)=>new Date().getFullYear()-i).map(y=>`<option>${y}</option>`).join('')}
        </select>
      </div>
      <div class="pm-field">
        <label>CEP</label>
        <input type="text" class="px-input" id="segCep" placeholder="00000-000" maxlength="9">
      </div>
      <div class="pm-field">
        <label>Perfil do condutor</label>
        <select class="px-input" id="segPerfil">
          <option>Proprietário principal</option>
          <option>Múltiplos condutores</option>
          <option>Jovem condutor (18-25)</option>
          <option>Condutor sênior (60+)</option>
        </select>
      </div>
    </div>
    <button class="px-btn" onclick="PagesMon.simularSeguro()">🔍 SIMULAR AGORA — GRÁTIS</button>
  </div>

  <!-- RESULTADOS (inicialmente ocultos) -->
  <div id="segResultados" style="display:none">
    <div class="px-card-title" style="margin:24px 0 12px">◈ MELHORES OFERTAS PARA VOCÊ</div>
    <div id="segCards"></div>
  </div>

  <!-- PLANOS -->
  <div class="px-card-title" style="margin:24px 0 12px">TIPOS DE COBERTURA</div>
  <div class="px-grid2">
    ${_segPlano('🔰','Básico','Cobertura contra roubo e furto','A partir de R$ 89/mês',['Roubo e furto','Incêndio','Assistência 24h'],'basic')}
    ${_segPlano('⭐','Intermediário','Colisão + roubo + terceiros','A partir de R$ 149/mês',['Tudo do Básico','Colisão parcial','Danos a terceiros'],'inter')}
    ${_segPlano('💎','Completo','Cobertura total sem franquia','A partir de R$ 219/mês',['Tudo do Inter','Colisão total','Vidros e faróis','Carro reserva'],'full')}
    ${_segPlano('🏢','Frota','Para empresas com 3+ veículos','Sob consulta',['Gestão centralizada','Desconto progressivo','Relatórios mensais'],'frota')}
  </div>

  <!-- PARCEIROS -->
  <div class="px-card">
    <div class="px-card-title">◈ PARCEIROS SEGURADORAS</div>
    <div class="pm-parceiros">
      ${['Porto Seguro','Bradesco Seguros','Allianz','Tokio Marine','Suhai','Azul Seguros'].map(p=>`
        <div class="pm-parceiro">${p}</div>`).join('')}
    </div>
  </div>

  <!-- POR QUE MOBYA -->
  <div class="px-card">
    <div class="px-card-title">◈ POR QUE CONTRATAR PELA MOBYA</div>
    <div class="pm-vantagens">
      ${_vant('💰','Economia real','Compare até 12 seguradoras e economize até 40%')}
      ${_vant('⚡','Contratação rápida','Do simulador ao seguro ativo em menos de 15 minutos')}
      ${_vant('🤖','IA de perfil','Nosso agente analisa seu perfil e sugere a melhor cobertura')}
      ${_vant('📱','Gestão no app','Acione sinistro, veja apólice e pague tudo aqui')}
    </div>
  </div>

</div>`;
  }

  function _segPlano(icon, nome, desc, preco, items, id) {
    return `
    <div class="pm-plano ${id==='full'?'pm-plano--dest':''}">
      ${id==='full'?'<div class="pm-popular">MAIS POPULAR</div>':''}
      <div class="pm-plano-icon">${icon}</div>
      <div class="pm-plano-nome">${nome}</div>
      <div class="pm-plano-desc">${desc}</div>
      <div class="pm-plano-preco">${preco}</div>
      <ul class="pm-plano-items">
        ${items.map(i=>`<li>✓ ${i}</li>`).join('')}
      </ul>
      <button class="px-btn px-btn--sm" style="width:100%;margin-top:12px" onclick="PagesMon.contratarSeguro('${nome}')">
        Simular ${nome}
      </button>
    </div>`;
  }

  function _vant(icon, titulo, desc) {
    return `
    <div class="pm-vant">
      <div class="pm-vant-icon">${icon}</div>
      <div><strong style="color:#fff">${titulo}</strong><br><span style="font-size:.78rem;color:var(--muted,#888)">${desc}</span></div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════
  // FINANCIAMENTO
  // ══════════════════════════════════════════════════════════
  function renderFinanciamento() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">

  <!-- HERO -->
  <div class="px-hero px-hero--gold">
    <div class="px-hero-icon">💰</div>
    <div>
      <div class="px-hero-title">FINANCIAMENTO VEICULAR</div>
      <div class="px-hero-sub">Aprovação em minutos · Melhores taxas do mercado</div>
    </div>
  </div>

  <!-- CALCULADORA -->
  <div class="px-card">
    <div class="px-card-title">◈ CALCULADORA DE PARCELAS</div>
    <div class="pm-form">
      <div class="pm-field">
        <label>Valor do veículo</label>
        <input type="text" class="px-input" id="finValor" placeholder="R$ 0,00" oninput="PagesMon.fmtValor(this)">
      </div>
      <div class="pm-field">
        <label>Sua renda líquida mensal</label>
        <input type="text" class="px-input" id="finRenda" placeholder="R$ 0,00" oninput="PagesMon.fmtRenda(this)">
      </div>
      <div class="pm-field">
        <label>Entrada (%)</label>
        <input type="range" id="finEntradaRange" min="0" max="80" value="20" oninput="PagesMon.updateEntrada()">
        <div class="pm-range-label">Entrada: <strong id="finEntradaPct">20%</strong> = <strong id="finEntradaVal">R$ 0</strong></div>
      </div>
      <div class="pm-field">
        <label>Prazo</label>
        <div class="pm-prazo-btns">
          ${[12,24,36,48,60,72].map(p=>`
            <button class="pm-prazo-btn ${p===36?'active':''}" onclick="PagesMon.setPrazo(${p},this)">${p}x</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="pm-resultado" id="finResultado">
      <div class="pm-res-row"><span>Valor financiado</span><strong id="finFinanciado">—</strong></div>
      <div class="pm-res-row"><span>Taxa mensal</span><strong id="finTaxa">—</strong></div>
      <div class="pm-res-row pm-res-dest"><span>Parcela estimada</span><strong id="finParcela">—</strong></div>
      <div class="pm-res-row"><span>Total a pagar</span><strong id="finTotal">—</strong></div>
    </div>
    <button class="px-btn" style="margin-top:14px" onclick="PagesMon.simularFinanciamento()">
      ⚡ SIMULAR COM BANCOS PARCEIROS
    </button>
  </div>

  <!-- OFERTAS BANCOS (oculto) -->
  <div id="finBancos" style="display:none">
    <div class="px-card-title" style="margin:24px 0 12px">◈ OFERTAS DOS BANCOS</div>
    <div id="finBancosCards"></div>
  </div>

  <!-- MODALIDADES -->
  <div class="px-card-title" style="margin:24px 0 12px">MODALIDADES DISPONÍVEIS</div>
  <div class="px-grid2">
    ${_finModal('🏦','CDC Tradicional','Crédito Direto ao Consumidor','Taxa a partir de 0,99% a.m.','Sem alienação fiduciária')}
    ${_finModal('🔒','Leasing','Arrendamento mercantil','Taxa a partir de 0,89% a.m.','IPVA por conta do banco')}
    ${_finModal('🤝','Consórcio','Sem juros, só taxa adm','Taxa adm: 12% total','Carta de crédito')}
    ${_finModal('💳','FGTS','Use seu saldo do FGTS','Complemento de entrada','Para veículos até R$ 80k')}
  </div>

  <!-- DOCUMENTOS -->
  <div class="px-card">
    <div class="px-card-title">◈ DOCUMENTOS NECESSÁRIOS</div>
    <div class="pm-docs">
      ${['RG e CPF','Comprovante de renda (3 últimos holerites)','Comprovante de residência','CNH válida','Extratos bancários (3 meses)'].map(d=>`
        <div class="pm-doc">📄 ${d}</div>`).join('')}
    </div>
    <button class="px-btn" style="margin-top:14px" onclick="PagesMon.iniciarFinanciamento()">
      🚀 INICIAR PROPOSTA AGORA
    </button>
  </div>

  <!-- TAXAS MERCADO -->
  <div class="px-card">
    <div class="px-card-title">◈ TAXAS DE REFERÊNCIA (JUNHO 2026)</div>
    <div class="pm-taxas">
      ${[
        ['Banco do Brasil','0,99% a.m.','11,25% a.a.'],
        ['Bradesco','1,09% a.m.','13,85% a.a.'],
        ['Itaú','1,15% a.m.','14,72% a.a.'],
        ['Santander','1,19% a.m.','15,28% a.a.'],
        ['Caixa','0,95% a.m.','10,70% a.a.'],
      ].map(([b,m,a])=>`
        <div class="pm-taxa-row">
          <span class="pm-taxa-banco">${b}</span>
          <span class="pm-taxa-val">${m}</span>
          <span class="pm-taxa-val pm-taxa-ano">${a}</span>
        </div>`).join('')}
    </div>
    <div style="font-size:.72rem;color:var(--muted,#888);margin-top:8px">* Taxas médias de mercado. Sujeitas a análise de crédito.</div>
  </div>

</div>`;

    // Inicializa calculadora
    setTimeout(() => PagesMon.updateEntrada(), 100);
  }

  function _finModal(icon, nome, desc, taxa, obs) {
    return `
    <div class="px-svc">
      <div class="px-svc-icon">${icon}</div>
      <div class="px-svc-title">${nome}</div>
      <div class="px-svc-desc">${desc}</div>
      <div class="px-svc-price">${taxa}</div>
      <div style="font-size:.72rem;color:var(--muted,#888);margin-top:4px">${obs}</div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════
  // CONSÓRCIO
  // ══════════════════════════════════════════════════════════
  function renderConsorcio() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">

  <!-- HERO -->
  <div class="px-hero px-hero--gold">
    <div class="px-hero-icon">🤝</div>
    <div>
      <div class="px-hero-title">CONSÓRCIO DE VEÍCULOS</div>
      <div class="px-hero-sub">Sem juros · Carta de crédito · Planeje sua compra</div>
    </div>
  </div>

  <!-- SIMULADOR -->
  <div class="px-card">
    <div class="px-card-title">◈ SIMULE SUA CARTA DE CRÉDITO</div>
    <div class="pm-form">
      <div class="pm-field">
        <label>Valor do veículo / carta desejada</label>
        <input type="text" class="px-input" id="conValor" placeholder="R$ 0,00" oninput="PagesMon.fmtValorCon(this)">
      </div>
      <div class="pm-field">
        <label>Prazo do grupo</label>
        <div class="pm-prazo-btns">
          ${[48,60,72,80].map(p=>`
            <button class="pm-prazo-btn ${p===60?'active':''}" onclick="PagesMon.setPrazoCon(${p},this)">${p}x</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="pm-resultado" id="conResultado">
      <div class="pm-res-row"><span>Taxa de administração</span><strong id="conTaxaAdm">16%</strong></div>
      <div class="pm-res-row"><span>Custo total do grupo</span><strong id="conCustoTotal">—</strong></div>
      <div class="pm-res-row pm-res-dest"><span>Parcela média estimada</span><strong id="conParcela">—</strong></div>
    </div>
    <button class="px-btn" style="margin-top:14px" onclick="PagesMon.simularConsorcio()">
      🤝 SIMULAR CONSÓRCIO
    </button>
    <button class="px-btn px-btn--sm" style="margin-top:10px;width:100%" onclick="PagesMon.aderirConsorcio()">
      🚀 SOLICITAR ADESÃO
    </button>
  </div>

  <!-- COMO FUNCIONA -->
  <div class="px-card-title" style="margin:24px 0 12px">COMO FUNCIONA</div>
  <div class="px-grid2">
    ${_finModal('📝','1. Adesão','Escolha o grupo e o valor da carta','Sem análise de crédito','Entrada de até 2 parcelas')}
    ${_finModal('🎲','2. Contemplação','Sorteio mensal + lances','Lance livre ou fixo','Aumenta a chance de antecipar')}
    ${_finModal('🚘','3. Compra','Use a carta em qualquer concessionária','0% juros','Só taxa de administração')}
    ${_finModal('💳','4. Pagamento','Parcelas fixas até o fim do grupo','Sem IOF','Pode quitar antecipado')}
  </div>

  <!-- AVISO -->
  <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:12px 16px;margin:20px 0;display:flex;gap:10px;align-items:flex-start">
    <span style="font-size:1.1rem;line-height:1">ℹ️</span>
    <span style="font-size:.78rem;color:var(--muted,#888);line-height:1.5">
      Simulação estimada com taxa de administração de referência (16% sobre o valor da carta).
      A contemplação não tem data garantida — depende de sorteio ou lance. Confirme taxas e prazos
      exatos com a administradora antes de aderir.
    </span>
  </div>

  <!-- ADMINISTRADORAS -->
  <div class="px-card">
    <div class="px-card-title">◈ ADMINISTRADORAS PARCEIRAS</div>
    <div class="pm-parceiros">
      ${['Porto Seguro Consórcio','Itaú Consórcio','Bradesco Consórcio','Embracon','Rodobens'].map(p=>`
        <div class="pm-parceiro">${p}</div>`).join('')}
    </div>
  </div>

</div>`;
  }

  // ══════════════════════════════════════════════════════════
  // SEJA UM PARCEIRO (cadastro de provider/monetização)
  // ══════════════════════════════════════════════════════════
  let _categoriesCache = null;
  async function renderMonetizacao() {
    const el = main(); if (!el) return;
    if (!API.isAuth()) {
      window.App?.toast?.('Faça login para se cadastrar como parceiro.', 'warn');
      window.MobyaAuth?.showLogin();
      return;
    }
    el.innerHTML = `
<div class="px-extra">
  <div class="px-hero px-hero--purple">
    <div class="px-hero-icon">🤝</div>
    <div>
      <div class="px-hero-title">SEJA UM PARCEIRO MOBYA</div>
      <div class="px-hero-sub">Cadastre seu negócio e receba clientes pela plataforma</div>
    </div>
  </div>

  <div class="px-card">
    <div class="px-card-title">◈ COMISSÕES POR VERTICAL</div>
    <div id="monRates" style="display:flex;flex-direction:column;gap:0">Carregando...</div>
  </div>

  <div class="px-card">
    <div class="px-card-title">◈ CADASTRE SEU NEGÓCIO</div>
    <div class="pm-form">
      <div class="pm-field"><label>Nome do negócio *</label><input class="px-input" id="monName" placeholder="Ex: Auto Center Silva"></div>
      <div class="pm-field">
        <label>Vertical *</label>
        <select class="px-input" id="monVertical" onchange="PagesMon.monUpdateCategories()">
          <option value="">Selecione...</option>
          <option value="SERVICE">Oficinas / Auto centers / Chaveiro</option>
          <option value="LOGISTICS">Fretes / Reboque / Peças</option>
          <option value="FLEET_RENTAL">Locadora de frota</option>
          <option value="INSURANCE">Seguros</option>
        </select>
      </div>
      <div class="pm-field" id="monCategoryWrap" style="display:none">
        <label>Categoria</label>
        <select class="px-input" id="monCategory"></select>
      </div>
      <div class="pm-field"><label>Cidade *</label><input class="px-input" id="monCity" placeholder="Ex: São Paulo"></div>
      <div class="pm-field"><label>Estado (UF) *</label><input class="px-input" id="monState" placeholder="Ex: SP" maxlength="2"></div>
      <div class="pm-field"><label>Telefone</label><input class="px-input" id="monPhone" placeholder="(00) 00000-0000"></div>
      <div class="pm-field"><label>E-mail</label><input class="px-input" id="monEmail" placeholder="contato@negocio.com"></div>
      <div class="pm-field"><label>CNPJ</label><input class="px-input" id="monCnpj" placeholder="00.000.000/0000-00"></div>
      <div class="pm-field"><label>Descrição</label><input class="px-input" id="monDesc" placeholder="Breve descrição do negócio"></div>
      <div class="pm-field">
        <label>Latitude * <span style="font-size:.7rem">(use seu GPS)</span></label>
        <input class="px-input" id="monLat" placeholder="Ex: -23.55052">
      </div>
      <div class="pm-field"><label>Longitude *</label><input class="px-input" id="monLng" placeholder="Ex: -46.633308"></div>
      <div class="pm-field" style="flex-direction:row;align-items:center;gap:8px">
        <input type="checkbox" id="monEmergency" style="width:auto">
        <label style="margin:0">Atendo emergências 24h</label>
      </div>
    </div>
    <button class="px-btn" onclick="PagesMon.monUseMyLocation()">📍 Usar minha localização atual</button>
    <button class="px-btn" style="margin-top:8px" onclick="PagesMon.cadastrarParceiro()">🤝 ENVIAR CADASTRO</button>
    <div style="font-size:.74rem;color:var(--muted,#888);margin-top:10px">
      Seu cadastro entra como pendente e é revisado pela equipe MOBYA em até 48h.
      Latitude/longitude são obrigatórias — sem elas o dispatch de proximidade não funciona.
    </div>
  </div>
</div>`;
    _loadMonRates();
  }

  async function _loadMonRates() {
    const wrap = document.getElementById('monRates'); if (!wrap) return;
    try {
      const r = await API.get('/monetization/rates');
      const rates = r.data?.verticals || [];
      wrap.innerHTML = rates.map(v => `
        <div class="pm-taxa-row"><span class="pm-taxa-banco">${v.desc}</span><span class="pm-taxa-val">${v.rate}</span></div>`).join('');
      _categoriesCache = null;
    } catch (e) {
      wrap.innerHTML = `<div style="font-size:.8rem;color:var(--muted,#888)">Não foi possível carregar as taxas agora.</div>`;
    }
  }

  async function monUpdateCategories() {
    const vertical = document.getElementById('monVertical')?.value;
    const wrap = document.getElementById('monCategoryWrap');
    const sel = document.getElementById('monCategory');
    if (!vertical || !wrap || !sel) { if (wrap) wrap.style.display = 'none'; return; }
    try {
      if (!_categoriesCache) {
        const r = await API.get('/monetization/categories');
        _categoriesCache = r.data || {};
      }
      const cats = _categoriesCache[vertical] || [];
      if (!cats.length) { wrap.style.display = 'none'; return; }
      sel.innerHTML = cats.map(c => `<option value="${c}">${c.replace(/_/g, ' ')}</option>`).join('');
      wrap.style.display = 'flex';
    } catch (e) { wrap.style.display = 'none'; }
  }

  function monUseMyLocation() {
    if (!navigator.geolocation) { Toast?.show('Geolocalização não disponível neste navegador.', 'err'); return; }
    Toast?.show('📍 Obtendo localização...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById('monLat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('monLng').value = pos.coords.longitude.toFixed(6);
        Toast?.show('📍 Localização capturada!', 'ok');
      },
      () => Toast?.show('Não foi possível obter sua localização. Preencha manualmente.', 'err'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function cadastrarParceiro() {
    const name = document.getElementById('monName')?.value.trim();
    const vertical = document.getElementById('monVertical')?.value;
    const city = document.getElementById('monCity')?.value.trim();
    const state = document.getElementById('monState')?.value.trim().toUpperCase();
    const latitude = document.getElementById('monLat')?.value;
    const longitude = document.getElementById('monLng')?.value;
    if (!name || !vertical || !city || !state) {
      Toast?.show('Nome, vertical, cidade e estado são obrigatórios.', 'err'); return;
    }
    if (!latitude || !longitude) {
      Toast?.show('Latitude e longitude são obrigatórias — use o botão de localização.', 'err'); return;
    }
    try {
      await API.monetization.createProvider({
        name, vertical, city, state, latitude, longitude,
        category: document.getElementById('monCategory')?.value || undefined,
        phone: document.getElementById('monPhone')?.value.trim() || undefined,
        email: document.getElementById('monEmail')?.value.trim() || undefined,
        cnpj: document.getElementById('monCnpj')?.value.trim() || undefined,
        description: document.getElementById('monDesc')?.value.trim() || undefined,
        emergency24h: !!document.getElementById('monEmergency')?.checked,
      });
      Toast?.show('🤝 Cadastro enviado! Aguardando aprovação em até 48h.', 'ok');
      window.App?.navigate('dashboard');
    } catch (e) {
      Toast?.show(e.message || 'Não foi possível enviar o cadastro agora.', 'err');
    }
  }

  // ══════════════════════════════════════════════════════════
  // PAINEL DE RECEITA (admin)
  // ══════════════════════════════════════════════════════════
  async function renderPainelReceita() {
    const el = main(); if (!el) return;
    el.innerHTML = `
<div class="px-extra">
  <div class="px-hero px-hero--purple">
    <div class="px-hero-icon">📊</div>
    <div>
      <div class="px-hero-title">PAINEL DE RECEITA</div>
      <div class="px-hero-sub">Visão consolidada de todas as fontes de monetização</div>
    </div>
  </div>
  <div id="prBody"><div style="color:var(--muted,#888);font-size:.85rem;padding:12px 0">Carregando...</div></div>
</div>`;
    try {
      const r = await API.monetization.dashboard();
      const d = r.data;
      const body = document.getElementById('prBody'); if (!body) return;
      body.innerHTML = `
        <div class="px-grid2" style="margin-bottom:16px">
          ${_prMetric('💰', 'Receita bruta consolidada', fmtBRLpr(d.consolidated.grossRevenue))}
          ${_prMetric('📈', 'Receita líquida consolidada', fmtBRLpr(d.consolidated.netRevenue))}
          ${_prMetric('🏪', 'Parceiros ativos', `${d.providers.active} / ${d.providers.total}`)}
          ${_prMetric('📋', 'Cotações totais', d.quotes.total)}
        </div>

        <div class="px-card-title" style="margin:20px 0 10px">RECEITA POR VERTICAL (marketplace)</div>
        <div class="px-card">
          <div class="pm-taxas">
            ${d.verticals.length ? d.verticals.map(v => `
              <div class="pm-taxa-row">
                <span class="pm-taxa-banco">${v.vertical} <span class="pm-taxa-ano">(${v.deals} negócios · ${v.rate})</span></span>
                <span class="pm-taxa-val">${fmtBRLpr(v.commission)}</span>
              </div>`).join('') : '<div style="font-size:.82rem;color:var(--muted,#888)">Sem dados ainda.</div>'}
          </div>
        </div>

        <div class="px-card-title" style="margin:20px 0 10px">EMERGÊNCIAS (reboque · mecânico · chaveiro)</div>
        <div class="px-card">
          <div class="pm-taxa-row"><span class="pm-taxa-banco">Volume bruto estimado</span><span class="pm-taxa-val">${fmtBRLpr(d.emergencyRevenue.grossVolume)}</span></div>
          <div class="pm-taxa-row"><span class="pm-taxa-banco">Comissão MOBYA</span><span class="pm-taxa-val">${fmtBRLpr(d.emergencyRevenue.mobyaCommission)}</span></div>
          <div class="pm-taxa-row"><span class="pm-taxa-banco">Pago aos prestadores</span><span class="pm-taxa-val">${fmtBRLpr(d.emergencyRevenue.providerNetPaid)}</span></div>
          <div class="pm-taxa-row"><span class="pm-taxa-banco">Jobs concluídos</span><span class="pm-taxa-val">${d.emergencyRevenue.completedJobs}</span></div>
          <div style="font-size:.72rem;color:var(--muted,#888);margin-top:8px">${d.emergencyRevenue.note}</div>
        </div>

        <div class="px-card-title" style="margin:20px 0 10px">ALUGUEL P2P</div>
        <div class="px-card">
          <div class="pm-taxa-row"><span class="pm-taxa-banco">Receita bruta MOBYA</span><span class="pm-taxa-val">${fmtBRLpr(d.rentalRevenue.mobyaGross)}</span></div>
          <div class="pm-taxa-row"><span class="pm-taxa-banco">Lucro líquido MOBYA</span><span class="pm-taxa-val">${fmtBRLpr(d.rentalRevenue.mobyaNet)}</span></div>
          <div class="pm-taxa-row"><span class="pm-taxa-banco">Reservas concluídas</span><span class="pm-taxa-val">${d.rentalRevenue.completedBookings}</span></div>
          <div style="font-size:.72rem;color:var(--muted,#888);margin-top:8px">${d.rentalRevenue.note}</div>
        </div>

        <div class="px-card-title" style="margin:20px 0 10px">TOP 5 PARCEIROS</div>
        <div class="px-card">
          ${d.topProviders.length ? d.topProviders.map(p => `
            <div class="pm-taxa-row">
              <span class="pm-taxa-banco">${p.name} ${p.vertical ? '<span class="pm-taxa-ano">(' + p.vertical + ')</span>' : ''}</span>
              <span class="pm-taxa-val">${fmtBRLpr(p.commission)} <span class="pm-taxa-ano">· ${p.deals}x</span></span>
            </div>`).join('') : '<div style="font-size:.82rem;color:var(--muted,#888)">Sem dados ainda.</div>'}
        </div>
      `;
    } catch (e) {
      const body = document.getElementById('prBody');
      if (body) body.innerHTML = `<div class="px-card" style="color:#ef4444;font-size:.85rem">${e.message || 'Não foi possível carregar o painel de receita agora.'}</div>`;
    }
  }

  function fmtBRLpr(v) { return `R$ ${parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }
  function _prMetric(icon, label, value) {
    return `
    <div class="px-card" style="text-align:center">
      <div style="font-size:1.6rem">${icon}</div>
      <div style="font-size:.74rem;color:var(--muted,#888);margin:6px 0">${label}</div>
      <div style="font-size:1.15rem;font-weight:700;color:#fff">${value}</div>
    </div>`;
  }

  const PagesMon = {

    // — SEGUROS —
    fmtValorSeg(el) {
      let v = el.value.replace(/\D/g,'');
      if (!v) { el.value=''; return; }
      v = (parseInt(v)/100).toFixed(2);
      el.value = 'R$ ' + parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2});
    },
    _getValorSeg() {
      const el = document.getElementById('segValor');
      if (!el||!el.value) return 0;
      return parseFloat(el.value.replace(/[^\d,]/g,'').replace(',','.')) || 0;
    },
    _lastSeguro: null,
    async simularSeguro() {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      const veiculoRaw = document.getElementById('segVeiculo')?.value?.trim();
      const valor = this._getValorSeg();
      if (!veiculoRaw || veiculoRaw.length < 3) { Toast?.show('Informe o modelo do veículo','err'); return; }
      if (!valor) { Toast?.show('Informe o valor estimado do veículo','err'); return; }

      const [vehicleBrand, ...rest] = veiculoRaw.split(' ');
      const vehicleModel = rest.join(' ') || veiculoRaw;
      const vehicleYear   = document.getElementById('segAno')?.value;
      const driverAge     = document.getElementById('segIdade')?.value;
      const cep           = document.getElementById('segCep')?.value;

      Toast?.show('🔍 Consultando seguradoras...','info');
      try {
        const r = await API.monetization.simulateInsurance({
          vehicleBrand, vehicleModel, vehicleYear, vehicleValue: valor,
          driverAge: driverAge || undefined,
        });
        this._lastSeguro = { veiculo: veiculoRaw, valor, data: r.data };

        const res   = document.getElementById('segResultados');
        const cards = document.getElementById('segCards');
        if (!res||!cards) return;

        const stars = '⭐⭐⭐⭐⭐';
        cards.innerHTML = r.data.insurers.map((o,i) => `
          <div class="pm-oferta ${i===0?'pm-oferta--dest':''}">
            ${i===0?'<div class="pm-popular">MELHOR OFERTA</div>':''}
            <div class="pm-oferta-top">
              <div>
                <div class="pm-oferta-seg">${o.name}</div>
                <div class="pm-oferta-cob">Risco ${r.data.riskLevel} · ${stars}</div>
              </div>
              <div class="pm-oferta-preco">R$ ${o.estimatedPremium.toLocaleString('pt-BR',{minimumFractionDigits:2})}/mês</div>
            </div>
            <div class="pm-oferta-eco">📊 Score de risco: ${r.data.riskScore}/100</div>
            <button class="px-btn px-btn--sm" style="width:100%;margin-top:10px" onclick="PagesMon.contratarSeguro('${o.name}', ${o.estimatedPremium})">
              Contratar ${o.name}
            </button>
          </div>`).join('') +
          (r.data.savingTips?.length ? `<div class="px-card" style="margin-top:12px"><div class="px-card-title">◈ DICAS PARA ECONOMIZAR</div>${
            r.data.savingTips.map(t=>`<div style="font-size:.82rem;color:var(--muted,#888);margin-bottom:6px">💡 ${t}</div>`).join('')
          }</div>` : '');

        res.style.display = 'block';
        res.scrollIntoView({behavior:'smooth'});
        Toast?.show(`✅ ${r.data.insurers.length} ofertas encontradas!`,'ok');
      } catch (e) {
        Toast?.show(e.message || 'Não foi possível simular o seguro agora.', 'err');
      }
    },

    async contratarSeguro(nome, premium) {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      try {
        const veiculo = this._lastSeguro?.veiculo || document.getElementById('segVeiculo')?.value || 'veículo';
        await API.monetization.createQuote({
          vertical: 'SEGUROS',
          description: `Contratação de seguro com ${nome} para ${veiculo}`,
          estimatedAmount: premium || this._lastSeguro?.data?.monthlyPremium?.max || null,
          insuranceProduct: 'AUTO_FULL',
        });
        Toast?.show(`🛡️ Cotação enviada para ${nome}! Nossa equipe entrará em contato.`,'ok');
      } catch (e) {
        Toast?.show(e.message || 'Não foi possível enviar a cotação agora.', 'err');
      }
    },

    // — FINANCIAMENTO —
    fmtValor(el) {
      let v = el.value.replace(/\D/g,'');
      if (!v) { el.value=''; return; }
      v = (parseInt(v)/100).toFixed(2);
      el.value = 'R$ ' + parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2});
      this.calcParcela();
    },

    fmtRenda(el) {
      let v = el.value.replace(/\D/g,'');
      if (!v) { el.value=''; return; }
      v = (parseInt(v)/100).toFixed(2);
      el.value = 'R$ ' + parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2});
    },

    setPrazo(p, btn) {
      _prazoAtual = p;
      document.querySelectorAll('.pm-prazo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.calcParcela();
    },

    updateEntrada() {
      const range = document.getElementById('finEntradaRange');
      const pct = document.getElementById('finEntradaPct');
      const val = document.getElementById('finEntradaVal');
      if (!range||!pct||!val) return;
      pct.textContent = range.value + '%';
      const total = this._getValor();
      val.textContent = 'R$ ' + (total * range.value / 100).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});
      this.calcParcela();
    },

    _getValor() {
      const el = document.getElementById('finValor');
      if (!el||!el.value) return 0;
      return parseFloat(el.value.replace(/[^\d,]/g,'').replace(',','.')) || 0;
    },

    _getRenda() {
      const el = document.getElementById('finRenda');
      if (!el||!el.value) return 0;
      return parseFloat(el.value.replace(/[^\d,]/g,'').replace(',','.')) || 0;
    },

    // Pré-visualização local instantânea (mesma fórmula Price usada pelo backend,
    // só para feedback em tempo real ao mover o slider — a simulação oficial
    // com bancos reais vem de simularFinanciamento()).
    calcParcela() {
      const total = this._getValor();
      if (!total) return;
      const entrada = total * (parseInt(document.getElementById('finEntradaRange')?.value||20)/100);
      const financiado = total - entrada;
      const taxa = 0.0109; // 1.09% a.m. — taxa de referência para preview
      const n = _prazoAtual;
      const parcela = financiado * (taxa * Math.pow(1+taxa,n)) / (Math.pow(1+taxa,n)-1);
      const totalPagar = parcela * n + entrada;

      const fmt = v => 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      document.getElementById('finFinanciado').textContent = fmt(financiado);
      document.getElementById('finTaxa').textContent = '1,09% a.m.';
      document.getElementById('finParcela').textContent = fmt(parcela);
      document.getElementById('finTotal').textContent = fmt(totalPagar);
    },

    _lastFinanciamento: null,
    async simularFinanciamento() {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      const total = this._getValor();
      if (!total) { Toast?.show('Informe o valor do veículo','err'); return; }
      const renda = this._getRenda();
      const entradaPct = parseInt(document.getElementById('finEntradaRange')?.value||20);
      const downPayment = total * entradaPct / 100;

      Toast?.show('⚡ Consultando bancos parceiros...','info');
      try {
        const r = await API.ai.financing({
          vehicleValue: total, downPayment, income: renda,
        });
        this._lastFinanciamento = { total, data: r.data };

        const cards = document.getElementById('finBancosCards');
        const container = document.getElementById('finBancos');
        if (!cards||!container) return;

        const n = _prazoAtual;
        const installmentKey = n <= 48 ? 'installment48' : 'installment60';
        cards.innerHTML = r.data.simulations.map((b,i) => `
          <div class="pm-oferta ${i===0?'pm-oferta--dest':''}">
            ${i===0?'<div class="pm-popular">MENOR TAXA</div>':''}
            <div class="pm-oferta-top">
              <div>
                <div class="pm-oferta-seg">${b.bank}</div>
                <div class="pm-oferta-cob">${b.monthlyRate}% a.m. · ${n}x ${b.approved ? '· ✅ Pré-aprovado' : '· ⚠️ Sujeito a análise'}</div>
              </div>
              <div class="pm-oferta-preco">R$ ${b[installmentKey].toLocaleString('pt-BR')}</div>
            </div>
            <button class="px-btn px-btn--sm" style="width:100%;margin-top:10px" onclick="PagesMon.iniciarFinanciamento('${b.bank}')">
              Solicitar ao ${b.bank}
            </button>
          </div>`).join('') +
          `<div class="px-card" style="margin-top:12px">
            <div class="px-card-title">◈ COMPROMETIMENTO MÁXIMO RECOMENDADO</div>
            <div style="font-size:.84rem;color:var(--muted,#888)">${r.data.summary.note} — R$ ${r.data.summary.maxInstallment.toLocaleString('pt-BR')}/mês</div>
          </div>`;

        container.style.display = 'block';
        container.scrollIntoView({behavior:'smooth'});
        Toast?.show(`✅ ${r.data.simulations.length} propostas encontradas!`,'ok');
      } catch (e) {
        Toast?.show(e.message || 'Não foi possível simular o financiamento agora.', 'err');
      }
    },

    async iniciarFinanciamento(banco) {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      try {
        const total = this._getValor() || this._lastFinanciamento?.total;
        await API.monetization.createQuote({
          vertical: 'FINANCIAMENTO',
          description: banco ? `Proposta de financiamento junto ao ${banco}` : 'Proposta de financiamento veicular',
          estimatedAmount: total || null,
        });
        const msg = banco ? `💰 Proposta enviada ao ${banco}!` : '💰 Proposta de financiamento enviada!';
        Toast?.show(msg,'ok');
      } catch (e) {
        Toast?.show(e.message || 'Não foi possível enviar a proposta agora.', 'err');
      }
    },

    // — CONSÓRCIO —
    fmtValorCon(el) {
      let v = el.value.replace(/\D/g,'');
      if (!v) { el.value=''; return; }
      v = (parseInt(v)/100).toFixed(2);
      el.value = 'R$ ' + parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2});
    },
    _getValorCon() {
      const elv = document.getElementById('conValor');
      if (!elv||!elv.value) return 0;
      return parseFloat(elv.value.replace(/[^\d,]/g,'').replace(',','.')) || 0;
    },
    setPrazoCon(p, btn) {
      this._prazoCon = p;
      btn.parentElement.querySelectorAll('.pm-prazo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    },
    _prazoCon: 60,
    _lastConsorcio: null,
    async simularConsorcio() {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      const valor = this._getValorCon();
      if (!valor) { Toast?.show('Informe o valor da carta de crédito','err'); return; }

      Toast?.show('🤝 Calculando simulação...','info');
      try {
        // O backend já calcula o bloco "consorcio" dentro de /ai/financing-simulation
        // (taxa adm 16%, sem juros) — reaproveitamos o mesmo endpoint determinístico.
        const r = await API.ai.financing({ vehicleValue: valor, downPayment: 0, income: 0 });
        const c = r.data?.consorcio;
        if (!c) throw new Error('Resposta inválida do simulador.');
        this._lastConsorcio = { valor, data: c };

        const n = this._prazoCon;
        document.getElementById('conTaxaAdm').textContent = c.adminFee;
        document.getElementById('conCustoTotal').textContent = 'R$ ' + c.totalCost.toLocaleString('pt-BR');
        document.getElementById('conParcela').textContent = 'R$ ' + Math.round(c.totalCost / n).toLocaleString('pt-BR');

        Toast?.show('✅ Simulação de consórcio pronta!','ok');
      } catch (e) {
        Toast?.show(e.message || 'Não foi possível simular o consórcio agora.', 'err');
      }
    },

    async aderirConsorcio(administradora) {
      if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
      try {
        const valor = this._getValorCon() || this._lastConsorcio?.valor;
        await API.monetization.createQuote({
          vertical: 'CONSORCIO',
          description: administradora ? `Adesão a consórcio junto à ${administradora}` : 'Adesão a consórcio de veículo',
          estimatedAmount: valor || null,
        });
        Toast?.show('🤝 Solicitação de adesão enviada!','ok');
      } catch (e) {
        Toast?.show(e.message || 'Não foi possível enviar a solicitação agora.', 'err');
      }
    },
  };

  window.PagesMon = PagesMon;
  // Expõe as páginas de render (eram privadas do closure e nunca chegavam
  // a app.js — por isso seguros/financiamento caíam no comingSoon).
  PagesMon.renderSeguros       = renderSeguros;
  PagesMon.renderFinanciamento = renderFinanciamento;
  PagesMon.renderConsorcio     = renderConsorcio;
  PagesMon.renderMonetizacao   = renderMonetizacao;
  PagesMon.renderPainelReceita = renderPainelReceita;
  PagesMon.monUpdateCategories = monUpdateCategories;
  PagesMon.monUseMyLocation    = monUseMyLocation;
  PagesMon.cadastrarParceiro   = cadastrarParceiro;

  // ══════════════════════════════════════════════════════════
  // CSS
  // ══════════════════════════════════════════════════════════
  if (!document.getElementById('px-style-pages-monetize')) {
  const style = document.createElement('style');
  style.id = 'px-style-pages-monetize';
  style.textContent = `
.px-hero--green{background:linear-gradient(135deg,rgba(5,150,105,.25),rgba(16,185,129,.1));border:1px solid rgba(16,185,129,.3)}
.px-hero--gold{background:linear-gradient(135deg,rgba(180,130,0,.25),rgba(245,158,11,.1));border:1px solid rgba(245,158,11,.3)}
.px-hero--purple{background:linear-gradient(135deg,rgba(124,58,237,.25),rgba(168,85,247,.1));border:1px solid rgba(168,85,247,.3)}
.pm-form{display:flex;flex-direction:column;gap:14px;margin-bottom:16px}
.pm-field{display:flex;flex-direction:column;gap:6px}
.pm-field label{font-size:.78rem;color:var(--muted,#888)}
.pm-parceiros{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.pm-parceiro{padding:10px;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;font-size:.8rem;color:var(--muted,#888)}
.pm-vantagens{display:flex;flex-direction:column;gap:14px}
.pm-vant{display:flex;align-items:flex-start;gap:14px}
.pm-vant-icon{font-size:1.5rem;flex-shrink:0}
.pm-plano{background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:18px;position:relative}
.pm-plano--dest{border-color:rgba(16,185,129,.5);background:rgba(16,185,129,.06)}
.pm-popular{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-size:.68rem;font-weight:700;padding:3px 12px;border-radius:20px;white-space:nowrap;letter-spacing:1px}
.pm-plano-icon{font-size:1.8rem;margin-bottom:8px}
.pm-plano-nome{font-weight:700;font-size:.95rem;color:#fff;margin-bottom:4px}
.pm-plano-desc{font-size:.78rem;color:var(--muted,#888);margin-bottom:8px}
.pm-plano-preco{font-family:'JetBrains Mono',monospace;font-size:.88rem;color:#10b981;font-weight:700;margin-bottom:10px}
.pm-plano-items{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px}
.pm-plano-items li{font-size:.78rem;color:var(--muted,#888)}
.pm-oferta{background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:16px;margin-bottom:10px;position:relative}
.pm-oferta--dest{border-color:rgba(245,158,11,.5);background:rgba(245,158,11,.05)}
.pm-oferta-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.pm-oferta-seg{font-weight:700;color:#fff;font-size:.9rem}
.pm-oferta-cob{font-size:.75rem;color:var(--muted,#888);margin-top:2px}
.pm-oferta-preco{font-family:'JetBrains Mono',monospace;font-size:1rem;color:#10b981;font-weight:700}
.pm-oferta-eco{font-size:.75rem;color:#f59e0b}
.pm-range-label{font-size:.78rem;color:var(--muted,#888);margin-top:4px}
.pm-prazo-btns{display:flex;gap:8px;flex-wrap:wrap}
.pm-prazo-btn{padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:transparent;color:var(--muted,#888);cursor:pointer;font-size:.84rem;transition:all .2s}
.pm-prazo-btn.active{background:linear-gradient(135deg,#7c3aed,#a855f7);border-color:transparent;color:#fff;font-weight:700}
.pm-resultado{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;margin-top:14px}
.pm-res-row{display:flex;justify-content:space-between;font-size:.84rem;color:var(--muted,#888)}
.pm-res-row strong{color:#fff}
.pm-res-dest{padding:10px 0;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.pm-res-dest span{font-size:.9rem;color:#fff;font-weight:600}
.pm-res-dest strong{font-size:1.1rem;color:#10b981;font-family:'JetBrains Mono',monospace}
.pm-docs{display:flex;flex-direction:column;gap:8px}
.pm-doc{font-size:.82rem;color:var(--muted,#888);padding:8px 12px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.06)}
.pm-taxas{display:flex;flex-direction:column;gap:0}
.pm-taxa-row{display:flex;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);align-items:center}
.pm-taxa-banco{flex:1;font-size:.84rem;color:#fff}
.pm-taxa-val{font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#10b981;min-width:80px;text-align:right}
.pm-taxa-ano{color:var(--muted,#888)}
input[type=range]{width:100%;accent-color:#7c3aed}
  `;
  document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════════════════
  // ROTEAMENTO
  // ══════════════════════════════════════════════════════════
  // O roteamento real de seguros/financiamento é feito direto em
  // BASE_PAGES (js/app.js), que chama PagesMon.renderX(). O patch
  // antigo sobrescrevia window.App.navigate, mas os cliques do menu
  // (data-page) chamam a função `navigate` interna do app.js, não
  // App.navigate — então o patch nunca era acionado. Removido.

})();
