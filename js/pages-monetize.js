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
        <label>Ano</label>
        <select class="px-input" id="segAno">
          ${Array.from({length:15},(_,i)=>2025-i).map(y=>`<option>${y}</option>`).join('')}
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
  // AÇÕES E LÓGICA
  // ══════════════════════════════════════════════════════════
  let _prazoAtual = 36;

  const PagesMon = {

    // — SEGUROS —
    simularSeguro() {
      const v = document.getElementById('segVeiculo')?.value;
      if (!v || v.length < 3) { Toast?.show('Informe o modelo do veículo','err'); return; }
      Toast?.show('🔍 Consultando seguradoras...','info');
      setTimeout(() => {
        const res = document.getElementById('segResultados');
        const cards = document.getElementById('segCards');
        if (!res||!cards) return;
        const ofertas = [
          {seg:'Porto Seguro', cobertura:'Completo', parcela:'R$ 234/mês', economia:'40%', stars:'⭐⭐⭐⭐⭐', dest:true},
          {seg:'Allianz',      cobertura:'Completo', parcela:'R$ 251/mês', economia:'36%', stars:'⭐⭐⭐⭐⭐', dest:false},
          {seg:'Bradesco',     cobertura:'Intermediário', parcela:'R$ 178/mês', economia:'28%', stars:'⭐⭐⭐⭐', dest:false},
          {seg:'Suhai',        cobertura:'Básico',  parcela:'R$ 97/mês',  economia:'15%', stars:'⭐⭐⭐⭐', dest:false},
        ];
        cards.innerHTML = ofertas.map(o => `
          <div class="pm-oferta ${o.dest?'pm-oferta--dest':''}">
            ${o.dest?'<div class="pm-popular">MELHOR OFERTA</div>':''}
            <div class="pm-oferta-top">
              <div>
                <div class="pm-oferta-seg">${o.seg}</div>
                <div class="pm-oferta-cob">${o.cobertura} · ${o.stars}</div>
              </div>
              <div class="pm-oferta-preco">${o.parcela}</div>
            </div>
            <div class="pm-oferta-eco">💰 Economia de até ${o.economia} vs mercado</div>
            <button class="px-btn px-btn--sm" style="width:100%;margin-top:10px" onclick="PagesMon.contratarSeguro('${o.seg}')">
              Contratar ${o.seg}
            </button>
          </div>`).join('');
        res.style.display = 'block';
        res.scrollIntoView({behavior:'smooth'});
        Toast?.show('✅ 4 ofertas encontradas!','ok');
      }, 1800);
    },

    contratarSeguro(nome) {
      if (typeof MobyaAuth !== 'undefined' && !MobyaAuth.isLogged()) { MobyaAuth.showLogin(); return; }
      Toast?.show(`🛡️ Iniciando contratação ${nome}...`,'ok');
    },

    // — FINANCIAMENTO —
    fmtValor(el) {
      let v = el.value.replace(/\D/g,'');
      if (!v) { el.value=''; return; }
      v = (parseInt(v)/100).toFixed(2);
      el.value = 'R$ ' + parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2});
      this.calcParcela();
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

    calcParcela() {
      const total = this._getValor();
      if (!total) return;
      const entrada = total * (parseInt(document.getElementById('finEntradaRange')?.value||20)/100);
      const financiado = total - entrada;
      const taxa = 0.0109; // 1.09% a.m.
      const n = _prazoAtual;
      // Fórmula Price
      const parcela = financiado * (taxa * Math.pow(1+taxa,n)) / (Math.pow(1+taxa,n)-1);
      const totalPagar = parcela * n + entrada;

      const fmt = v => 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      document.getElementById('finFinanciado').textContent = fmt(financiado);
      document.getElementById('finTaxa').textContent = '1,09% a.m.';
      document.getElementById('finParcela').textContent = fmt(parcela);
      document.getElementById('finTotal').textContent = fmt(totalPagar);
    },

    simularFinanciamento() {
      const total = this._getValor();
      if (!total) { Toast?.show('Informe o valor do veículo','err'); return; }
      Toast?.show('⚡ Consultando bancos parceiros...','info');
      setTimeout(() => {
        const entrada = total * (parseInt(document.getElementById('finEntradaRange')?.value||20)/100);
        const fin = total - entrada;
        const n = _prazoAtual;
        const bancos = [
          {nome:'Caixa Econômica', taxa:0.0095, cor:'#0ea5e9'},
          {nome:'Banco do Brasil', taxa:0.0099, cor:'#f59e0b'},
          {nome:'Bradesco',        taxa:0.0109, cor:'#ef4444'},
          {nome:'Santander',       taxa:0.0119, cor:'#dc2626'},
        ];
        const fmt = v => 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        const cards = document.getElementById('finBancosCards');
        const container = document.getElementById('finBancos');
        if (!cards||!container) return;
        cards.innerHTML = bancos.map((b,i) => {
          const parc = fin * (b.taxa * Math.pow(1+b.taxa,n)) / (Math.pow(1+b.taxa,n)-1);
          return `
          <div class="pm-oferta ${i===0?'pm-oferta--dest':''}">
            ${i===0?'<div class="pm-popular">MENOR TAXA</div>':''}
            <div class="pm-oferta-top">
              <div>
                <div class="pm-oferta-seg">${b.nome}</div>
                <div class="pm-oferta-cob">${(b.taxa*100).toFixed(2).replace('.',',')}% a.m. · ${n}x</div>
              </div>
              <div class="pm-oferta-preco">${fmt(parc)}</div>
            </div>
            <button class="px-btn px-btn--sm" style="width:100%;margin-top:10px" onclick="PagesMon.iniciarFinanciamento('${b.nome}')">
              Solicitar ao ${b.nome}
            </button>
          </div>`;
        }).join('');
        container.style.display = 'block';
        container.scrollIntoView({behavior:'smooth'});
        Toast?.show('✅ 4 propostas encontradas!','ok');
      }, 2000);
    },

    iniciarFinanciamento(banco) {
      if (typeof MobyaAuth !== 'undefined' && !MobyaAuth.isLogged()) { MobyaAuth.showLogin(); return; }
      const msg = banco ? `💰 Proposta enviada ao ${banco}!` : '💰 Iniciando sua proposta de financiamento!';
      Toast?.show(msg,'ok');
    },
  };

  window.PagesMon = PagesMon;

  // ══════════════════════════════════════════════════════════
  // CSS
  // ══════════════════════════════════════════════════════════
  const style = document.createElement('style');
  style.textContent = `
.px-hero--green{background:linear-gradient(135deg,rgba(5,150,105,.25),rgba(16,185,129,.1));border:1px solid rgba(16,185,129,.3)}
.px-hero--gold{background:linear-gradient(135deg,rgba(180,130,0,.25),rgba(245,158,11,.1));border:1px solid rgba(245,158,11,.3)}
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

  // ══════════════════════════════════════════════════════════
  // PATCH DE ROTAS
  // ══════════════════════════════════════════════════════════
  const _patch = () => {
    if (typeof window.App !== 'undefined') {
      const orig = window.App.navigate.bind(window.App);
      window.App.navigate = function(page, ...args) {
        if (page === 'seguros')       { renderSeguros();       _setActive(page); return; }
        if (page === 'financiamento') { renderFinanciamento(); _setActive(page); return; }
        return orig(page, ...args);
      };
    }
  };

  function _setActive(page) {
    document.querySelectorAll('.nb,.sb-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));
  }

  _patch();
  window.addEventListener('load', _patch);

})();
