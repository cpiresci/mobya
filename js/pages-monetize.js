// ============================================================
// MOBYA — pages-monetize.js  (v2.0 — integração real)
// Páginas: Seguros e Financiamento
// Carregar APÓS pages-extra.js no index.html
// ============================================================

(function () {

  const main = () => document.getElementById('main');
  const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const authGuard = (cb) => {
    if (typeof MobyaAuth !== 'undefined') { MobyaAuth.requireAuth(cb); return; }
    if (!API.isAuth()) { Toast.show('Faça login para continuar.','warn'); return; }
    cb();
  };

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
      <div class="px-hero-sub">Simulação inteligente · Score de risco personalizado</div>
    </div>
  </div>

  <!-- SIMULADOR -->
  <div class="px-card">
    <div class="px-card-title">◈ SIMULE SEU SEGURO</div>
    <div class="pm-form">
      <div class="px-form-row">
        <div class="pm-field">
          <label>Marca do veículo</label>
          <input type="text" class="px-input" id="segMarca" placeholder="Ex: Toyota">
        </div>
        <div class="pm-field">
          <label>Modelo</label>
          <input type="text" class="px-input" id="segModelo" placeholder="Ex: Corolla">
        </div>
      </div>
      <div class="px-form-row">
        <div class="pm-field">
          <label>Ano</label>
          <select class="px-input" id="segAno">
            ${Array.from({length:20},(_,i)=>2025-i).map(y=>`<option>${y}</option>`).join('')}
          </select>
        </div>
        <div class="pm-field">
          <label>Valor do veículo (R$)</label>
          <input type="text" class="px-input" id="segValor" placeholder="Ex: 85000" oninput="PagesMon._fmtSegValor(this)">
        </div>
      </div>
      <div class="px-form-row">
        <div class="pm-field">
          <label>Cidade do condutor</label>
          <input type="text" class="px-input" id="segCidade" placeholder="Ex: São Paulo">
        </div>
        <div class="pm-field">
          <label>Estado (UF)</label>
          <input type="text" class="px-input" id="segEstado" placeholder="SP" maxlength="2" style="text-transform:uppercase">
        </div>
      </div>
      <div class="px-form-row">
        <div class="pm-field">
          <label>Idade do condutor principal</label>
          <input type="number" class="px-input" id="segIdade" placeholder="Ex: 35" min="18" max="99">
        </div>
        <div class="pm-field">
          <label>Produto</label>
          <select class="px-input" id="segProduto">
            <option value="AUTO_FULL">Auto Completo</option>
            <option value="AUTO_POPULAR">Auto Popular</option>
            <option value="LIFE">Vida</option>
            <option value="CONSORTIUM_AUTO">Consórcio Auto</option>
          </select>
        </div>
      </div>
    </div>
    <button class="px-btn" id="segBtnSim" onclick="PagesMon.simularSeguro()">
      🔍 SIMULAR AGORA — GRÁTIS
    </button>
  </div>

  <!-- RESULTADOS (ocultos) -->
  <div id="segResultados" style="display:none">
    <div id="segRiskCard"></div>
    <div class="px-card-title" style="margin:24px 0 12px">◈ MELHORES OFERTAS PARA VOCÊ</div>
    <div id="segCards"></div>
  </div>

  <!-- PLANOS DE REFERÊNCIA -->
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
      ${_vant('🤖','Score de risco personalizado','Análise heurística do seu perfil e veículo')}
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
    <div class="px-card" style="margin-top:12px">
      <div class="px-card-title">◈ SOLICITAR PROPOSTA FORMAL</div>
      <div style="font-size:.82rem;color:var(--muted);margin-bottom:14px">Registre sua intenção e um especialista MOBYA entrará em contato.</div>
      <button class="px-btn" onclick="PagesMon.registrarIntencaoFinanciamento()">
        🚀 REGISTRAR PROPOSTA DE FINANCIAMENTO
      </button>
      <div id="finQuoteFeedback" style="display:none;margin-top:12px"></div>
    </div>
  </div>

  <!-- MODALIDADES -->
  <div class="px-card-title" style="margin:24px 0 12px">MODALIDADES DISPONÍVEIS</div>
  <div class="px-grid2">
    ${_finModal('🏦','CDC Tradicional','Crédito Direto ao Consumidor','A partir de 0,99% a.m.','Sem alienação fiduciária')}
    ${_finModal('🔒','Leasing','Arrendamento mercantil','A partir de 0,89% a.m.','IPVA por conta do banco')}
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
  let _finSimulado = null; // guarda resultado da simulação para usar no quote

  const PagesMon = {

    // ── SEGUROS ───────────────────────────────────────────────

    _fmtSegValor(el) {
      // permite digitar número puro e formata ao sair
      el.value = el.value.replace(/[^\d]/g,'');
    },

    // Chama POST /monetization/insurance/simulate
    simularSeguro() {
      const marca   = document.getElementById('segMarca')?.value?.trim();
      const modelo  = document.getElementById('segModelo')?.value?.trim();
      const ano     = document.getElementById('segAno')?.value;
      const valorRaw = document.getElementById('segValor')?.value?.replace(/[^\d]/g,'');
      const valor   = parseFloat(valorRaw);
      const cidade  = document.getElementById('segCidade')?.value?.trim();
      const estado  = document.getElementById('segEstado')?.value?.trim().toUpperCase();
      const idade   = document.getElementById('segIdade')?.value;
      const produto = document.getElementById('segProduto')?.value;

      if (!marca || !modelo)       { Toast.show('Informe marca e modelo do veículo.','err'); return; }
      if (!valor || isNaN(valor))  { Toast.show('Informe o valor do veículo.','err'); return; }

      const btn = document.getElementById('segBtnSim');
      if (btn) { btn.disabled = true; btn.textContent = '⟳ Consultando seguradoras...'; }

      Monetization.api.insuranceSim({
        vehicleBrand:  marca,
        vehicleModel:  modelo,
        vehicleYear:   parseInt(ano),
        vehicleValue:  valor,
        driverCity:    cidade || undefined,
        driverState:   estado || undefined,
        driverAge:     idade ? parseInt(idade) : undefined,
        product:       produto,
      })
        .then(r => {
          const d = r.data;
          const res   = document.getElementById('segResultados');
          const cards = document.getElementById('segCards');
          const risk  = document.getElementById('segRiskCard');
          if (!res||!cards||!risk) return;

          // Risk card
          const riskColor = d.riskLevel === 'baixo' ? '#10b981' : d.riskLevel === 'médio' ? '#f59e0b' : '#ef4444';
          const riskBar   = Math.round(d.riskScore);
          risk.innerHTML = `
            <div class="px-card" style="border-color:${riskColor}40;background:${riskColor}08">
              <div class="px-card-title" style="color:${riskColor}">◈ SEU SCORE DE RISCO</div>
              <div class="pm-risk-row">
                <div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:2rem;font-weight:700;color:${riskColor}">${d.riskScore}<span style="font-size:1rem">/100</span></div>
                  <div style="font-size:.82rem;color:var(--muted);margin-top:4px">Risco <strong style="color:${riskColor}">${d.riskLevel.toUpperCase()}</strong></div>
                </div>
                <div style="flex:1;margin-left:20px">
                  <div class="pm-risk-bar-bg"><div class="pm-risk-bar-fill" style="width:${riskBar}%;background:${riskColor}"></div></div>
                </div>
              </div>
              ${d.riskFactors?.length ? `
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
                ${d.riskFactors.map(f=>`<div style="font-size:.78rem;color:var(--muted);padding:6px 10px;background:rgba(255,255,255,.03);border-radius:6px;border-left:2px solid ${riskColor}">⚠ ${f}</div>`).join('')}
              </div>` : ''}
              <div style="margin-top:14px">
                <div style="font-size:.78rem;color:var(--muted);margin-bottom:6px">Prêmio mensal estimado</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:1.1rem;color:#10b981;font-weight:700">
                  ${fmtBRL(d.monthlyPremium.min)} <span style="color:var(--muted);font-size:.82rem">até</span> ${fmtBRL(d.monthlyPremium.max)}
                </div>
              </div>
            </div>`;

          // Cards seguradoras
          cards.innerHTML = d.insurers.map((ins, i) => `
            <div class="pm-oferta ${i===0?'pm-oferta--dest':''}">
              ${i===0?'<div class="pm-popular">MELHOR OFERTA</div>':''}
              <div class="pm-oferta-top">
                <div>
                  <div class="pm-oferta-seg">${ins.name}</div>
                  <div class="pm-oferta-cob">${ins.highlight}</div>
                </div>
                <div class="pm-oferta-preco">${fmtBRL(ins.estimatedPremium)}<span style="font-size:.72rem;font-weight:400;font-family:'Space Grotesk',sans-serif">/mês</span></div>
              </div>
              <button class="px-btn px-btn--sm" style="width:100%;margin-top:10px" onclick="PagesMon.contratarSeguro('${ins.name}')">
                Contratar ${ins.name}
              </button>
            </div>`).join('');

          // Dicas
          if (d.savingTips?.length) {
            cards.innerHTML += `
              <div class="px-card" style="margin-top:12px">
                <div class="px-card-title">◈ DICAS PARA REDUZIR O PRÊMIO</div>
                <div style="display:flex;flex-direction:column;gap:8px">
                  ${d.savingTips.map(t=>`<div style="font-size:.8rem;color:var(--muted);padding:8px 12px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.15);border-radius:8px">💡 ${t}</div>`).join('')}
                </div>
              </div>`;
          }

          res.style.display = 'block';
          res.scrollIntoView({ behavior:'smooth' });
          Toast.show(`✅ ${d.insurers.length} seguradoras encontradas!`,'ok');
        })
        .catch(e => {
          Toast.show(e.message || 'Erro ao simular seguro.','err');
        })
        .finally(() => {
          if (btn) { btn.disabled = false; btn.textContent = '🔍 SIMULAR AGORA — GRÁTIS'; }
        });
    },

    contratarSeguro(nome) {
      authGuard(() => {
        Monetization.api.createQuote({
          vertical: 'INSURANCE',
          description: `Contratação de seguro ${nome} — via simulador MOBYA`,
          insuranceProduct: document.getElementById('segProduto')?.value || 'AUTO_FULL',
        })
          .then(r => {
            Toast.show(`🛡️ Proposta enviada para ${nome}! ID: ${r.data?.id||'—'}`, 'ok', 5000);
          })
          .catch(e => Toast.show(e.message||'Erro ao enviar proposta.','err'));
      });
    },

    // ── FINANCIAMENTO ─────────────────────────────────────────

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
      const pct   = document.getElementById('finEntradaPct');
      const val   = document.getElementById('finEntradaVal');
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
      const entrada    = total * (parseInt(document.getElementById('finEntradaRange')?.value||20)/100);
      const financiado = total - entrada;
      const taxa = 0.0109;
      const n    = _prazoAtual;
      const parcela    = financiado * (taxa * Math.pow(1+taxa,n)) / (Math.pow(1+taxa,n)-1);
      const totalPagar = parcela * n + entrada;

      const fmt = v => 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      document.getElementById('finFinanciado').textContent = fmt(financiado);
      document.getElementById('finTaxa').textContent = '1,09% a.m.';
      document.getElementById('finParcela').textContent = fmt(parcela);
      document.getElementById('finTotal').textContent = fmt(totalPagar);
    },

    simularFinanciamento() {
      const total = this._getValor();
      if (!total) { Toast.show('Informe o valor do veículo.','err'); return; }

      Toast.show('⚡ Calculando propostas...','info');

      const entrada    = total * (parseInt(document.getElementById('finEntradaRange')?.value||20)/100);
      const financiado = total - entrada;
      const n          = _prazoAtual;

      const bancos = [
        {nome:'Caixa Econômica', taxa:0.0095},
        {nome:'Banco do Brasil', taxa:0.0099},
        {nome:'Bradesco',        taxa:0.0109},
        {nome:'Santander',       taxa:0.0119},
        {nome:'Itaú',            taxa:0.0115},
      ];

      const fmt = v => 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

      _finSimulado = { total, entrada, financiado, prazo: n };

      const cards     = document.getElementById('finBancosCards');
      const container = document.getElementById('finBancos');
      if (!cards||!container) return;

      cards.innerHTML = bancos
        .map(b => ({ ...b, parcela: financiado * (b.taxa * Math.pow(1+b.taxa,n)) / (Math.pow(1+b.taxa,n)-1) }))
        .sort((a,b) => a.parcela - b.parcela)
        .map((b, i) => `
          <div class="pm-oferta ${i===0?'pm-oferta--dest':''}">
            ${i===0?'<div class="pm-popular">MENOR TAXA</div>':''}
            <div class="pm-oferta-top">
              <div>
                <div class="pm-oferta-seg">${b.nome}</div>
                <div class="pm-oferta-cob">${(b.taxa*100).toFixed(2).replace('.',',')}% a.m. · ${n}x</div>
              </div>
              <div class="pm-oferta-preco">${fmt(b.parcela)}<span style="font-size:.72rem;font-weight:400;font-family:'Space Grotesk',sans-serif">/mês</span></div>
            </div>
          </div>`).join('');

      container.style.display = 'block';
      container.scrollIntoView({ behavior:'smooth' });
      Toast.show(`✅ ${bancos.length} propostas calculadas!`,'ok');
    },

    // Registra quote de FINANCIAMENTO no backend
    registrarIntencaoFinanciamento() {
      authGuard(() => {
        if (!_finSimulado) { Toast.show('Simule o financiamento primeiro.','warn'); return; }

        const { total, entrada, financiado, prazo } = _finSimulado;
        const desc = `Financiamento veicular: veículo R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:0})}, entrada ${Math.round((entrada/total)*100)}%, ${prazo}x — via MOBYA`;

        const btn = document.querySelector('#finBancos .px-btn');
        if (btn) { btn.disabled = true; btn.textContent = '⟳ Registrando...'; }

        Monetization.api.createQuote({
          vertical:        'LOGISTICS',  // INSURANCE vertical não tem produto exato, usando LOGISTICS como "serviço financeiro"
          description:     desc,
          estimatedAmount: financiado,
        })
          .then(r => {
            const fb = document.getElementById('finQuoteFeedback');
            if (fb) {
              fb.style.display = 'block';
              fb.innerHTML = `
                <div style="background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:14px;text-align:center">
                  <div style="font-size:1.4rem;margin-bottom:6px">✅</div>
                  <div style="font-weight:700;color:#10b981;margin-bottom:4px">Proposta registrada!</div>
                  <div style="font-size:.78rem;color:var(--muted)">ID: <code style="color:#a78bfa">${r.data?.id||'—'}</code></div>
                  <div style="font-size:.78rem;color:var(--muted);margin-top:6px">Um especialista MOBYA entrará em contato em até 24h.</div>
                </div>`;
            }
            Toast.show('💰 Proposta registrada! Aguarde contato em até 24h.','ok', 6000);
          })
          .catch(e => Toast.show(e.message||'Erro ao registrar proposta.','err'))
          .finally(() => {
            if (btn) { btn.disabled = false; btn.textContent = '🚀 REGISTRAR PROPOSTA DE FINANCIAMENTO'; }
          });
      });
    },
  };

  window.PagesMon = PagesMon;
  PagesMon.renderSeguros       = renderSeguros;
  PagesMon.renderFinanciamento = renderFinanciamento;

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
.pm-oferta-preco{font-family:'JetBrains Mono',monospace;font-size:1rem;color:#10b981;font-weight:700;text-align:right}
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
/* risk score */
.pm-risk-row{display:flex;align-items:center;gap:16px;margin-top:8px}
.pm-risk-bar-bg{width:100%;height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden}
.pm-risk-bar-fill{height:100%;border-radius:4px;transition:width .6s ease}
@media(max-width:480px){.px-form-row{grid-template-columns:1fr}.pm-risk-row{flex-direction:column;align-items:flex-start}}
  `;
  document.head.appendChild(style);

})();
