// ============================================================
// MOBYA — pages-extra.js  (v2.0 — integração real)
// Páginas: Reboque, Chaveiro, Aluguel
// Carregar APÓS monetization.js no index.html
// ============================================================

(function () {

  // ── UTILITÁRIOS ────────────────────────────────────────────
  const main  = () => document.getElementById('main');
  const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const authGuard = (cb) => {
    if (typeof MobyaAuth !== 'undefined') { MobyaAuth.requireAuth(cb); return; }
    if (!API.isAuth()) { Toast.show('Faça login para continuar.','warn'); return; }
    cb();
  };

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
      <div class="px-hero-sub">Atendimento 24h · Cotação instantânea</div>
    </div>
    <div class="px-badge px-badge--live">● AO VIVO</div>
  </div>

  <!-- FORMULÁRIO DE COTAÇÃO -->
  <div class="px-card">
    <div class="px-card-title">◈ COTAR REBOQUE / GUINCHO</div>
    <div class="px-form-col">
      <div class="px-form-group">
        <label>Tipo de serviço</label>
        <select class="px-input" id="rebTipo">
          <option value="TOW">Guincho / Reboque</option>
          <option value="FREIGHT">Transporte de veículo</option>
        </select>
      </div>
      <div class="px-form-row">
        <div class="px-form-group">
          <label>Cidade de origem</label>
          <input type="text" class="px-input" id="rebOrigem" placeholder="Ex: São Paulo">
        </div>
        <div class="px-form-group">
          <label>Cidade de destino</label>
          <input type="text" class="px-input" id="rebDestino" placeholder="Ex: Campinas">
        </div>
      </div>
      <div class="px-form-row">
        <div class="px-form-group">
          <label>Tipo de veículo</label>
          <select class="px-input" id="rebVeiculo">
            <option>Carro</option>
            <option>SUV</option>
            <option>Moto</option>
            <option>Caminhonete</option>
            <option>Caminhão</option>
          </select>
        </div>
        <div class="px-form-group">
          <label>Distância estimada (km)</label>
          <input type="number" class="px-input" id="rebKm" placeholder="Ex: 50" min="1">
        </div>
      </div>
      <div class="px-form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="rebUrgente" style="width:16px;height:16px;accent-color:#7c3aed">
          <span>Serviço urgente <span style="color:var(--muted);font-size:.75rem">(+35% sobretaxa)</span></span>
        </label>
      </div>
    </div>
    <button class="px-btn" id="rebBtnCotar" onclick="PagesExtra.cotarReboque()">
      🚛 CALCULAR COTAÇÃO
    </button>
  </div>

  <!-- RESULTADO DA COTAÇÃO (oculto) -->
  <div id="rebResultado" style="display:none">
    <div class="px-card px-card--highlight" id="rebResultadoCard"></div>
  </div>

  <!-- SERVIÇOS DE REFERÊNCIA -->
  <div class="px-card-title" style="margin:24px 0 12px">SERVIÇOS DISPONÍVEIS</div>
  <div class="px-grid2">
    ${_serviceCard('🚛','Guincho Plataforma','Veículos de passeio e SUVs','A partir de R$ 180','reboque')}
    ${_serviceCard('🏍️','Moto Guincho','Motos e scooters','A partir de R$ 120','reboque')}
    ${_serviceCard('🚚','Guincho Pesado','Caminhões e vans','A partir de R$ 350','reboque')}
    ${_serviceCard('⛽','Combustível','Entrega no local','A partir de R$ 40','reboque')}
    ${_serviceCard('🔋','Pane Elétrica','Carga de bateria','A partir de R$ 80','reboque')}
    ${_serviceCard('🔑','Abertura de Porta','Sem danos ao veículo','A partir de R$ 100','chaveiro')}
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

  <!-- SOLICITAÇÃO -->
  <div class="px-card">
    <div class="px-card-title">◈ SOLICITAR ATENDIMENTO</div>
    <div class="px-form-col">
      <div class="px-form-row">
        <div class="px-form-group">
          <label>Cidade</label>
          <input type="text" class="px-input" id="chavCidade" placeholder="Ex: São Paulo">
        </div>
        <div class="px-form-group">
          <label>Estado (UF)</label>
          <input type="text" class="px-input" id="chavEstado" placeholder="SP" maxlength="2" style="text-transform:uppercase">
        </div>
      </div>
      <div class="px-form-group">
        <label>Tipo de serviço necessário</label>
        <select class="px-input" id="chavTipo">
          <option value="abertura">Abertura de porta</option>
          <option value="copia">Cópia de chave</option>
          <option value="codificada">Chave codificada / transponder</option>
          <option value="ignicao">Reparo de ignição</option>
          <option value="keyfob">Programação de controle (key fob)</option>
        </select>
      </div>
      <div class="px-form-group">
        <label>Descrição (modelo do carro, situação)</label>
        <input type="text" class="px-input" id="chavDesc" placeholder="Ex: Honda Civic 2020, chave trancada no carro">
      </div>
    </div>
    <button class="px-btn px-btn--purple" id="chavBtnSol" onclick="PagesExtra.solicitarChaveiro()">
      🔑 SOLICITAR CHAVEIRO AGORA
    </button>
    <div id="chavFeedback" style="display:none;margin-top:14px"></div>
  </div>

  <div class="px-card-title" style="margin:24px 0 12px">SERVIÇOS E PREÇOS DE REFERÊNCIA</div>
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
      <div class="px-step"><div class="px-step-n">2</div><div><strong>Confirmação</strong><br>Cotação enviada. Parceiro confirmado em minutos</div></div>
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
      <div class="px-hero-sub">Locadoras parceiras · Retirada imediata</div>
    </div>
  </div>

  <!-- BUSCA -->
  <div class="px-card">
    <div class="px-card-title">◈ BUSCAR LOCADORAS</div>
    <div class="px-form-row">
      <div class="px-form-group">
        <label>Cidade</label>
        <input type="text" class="px-input" id="algCidade" placeholder="Ex: São Paulo">
      </div>
      <div class="px-form-group">
        <label>Estado (UF)</label>
        <input type="text" class="px-input" id="algEstado" placeholder="SP" maxlength="2" style="text-transform:uppercase">
      </div>
    </div>
    <button class="px-btn" onclick="PagesExtra.buscarLocadoras()">🔍 BUSCAR LOCADORAS</button>
  </div>

  <!-- RESULTADO DA BUSCA (oculto) -->
  <div id="algResultado" style="display:none">
    <div class="px-card-title" style="margin:24px 0 12px">◈ LOCADORAS DISPONÍVEIS</div>
    <div id="algCards"></div>
    <div id="algEmpty" style="display:none" class="px-card" >
      <div style="text-align:center;padding:20px;color:var(--muted)">
        <div style="font-size:2rem;margin-bottom:8px">🔍</div>
        <div>Nenhuma locadora cadastrada nesta cidade ainda.</div>
        <div style="font-size:.78rem;margin-top:6px">Quer cadastrar sua locadora? <button onclick="PagesExtra.cadastrarLocadora()" style="background:none;border:none;color:#a78bfa;cursor:pointer;font-weight:600">Clique aqui</button></div>
      </div>
    </div>
  </div>

  <!-- FROTA DE REFERÊNCIA -->
  <div class="px-card-title" style="margin:24px 0 12px">CATEGORIAS DISPONÍVEIS</div>
  <div id="aluguelFrota">
    ${_carCard('Econômico','Hatch compacto ou similar','Manual · Ar-condicionado','A partir de R$ 89/dia','🚗','cyan')}
    ${_carCard('Intermediário','Sedan médio ou similar','Automático · Ar-condicionado','A partir de R$ 149/dia','🚙','cyan')}
    ${_carCard('SUV','SUV médio ou similar','Automático · 4x4','A partir de R$ 229/dia','🚐','cyan')}
    ${_carCard('Pickup','Pickup ou similar','Automático · 4x4','A partir de R$ 299/dia','🛻','cyan')}
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

  // ── AÇÕES COM INTEGRAÇÃO REAL ──────────────────────────────
  const PagesExtra = {

    // REBOQUE: chama POST /monetization/logistics/quote
    cotarReboque() {
      const tipo    = document.getElementById('rebTipo')?.value;
      const origem  = document.getElementById('rebOrigem')?.value?.trim();
      const destino = document.getElementById('rebDestino')?.value?.trim();
      const veiculo = document.getElementById('rebVeiculo')?.value;
      const km      = document.getElementById('rebKm')?.value;
      const urgente = document.getElementById('rebUrgente')?.checked;

      if (!origem || !destino) { Toast.show('Informe cidade de origem e destino.','err'); return; }

      const btn = document.getElementById('rebBtnCotar');
      if (btn) { btn.disabled = true; btn.textContent = '⟳ Calculando...'; }

      const payload = {
        type: tipo,
        originCity: origem,
        destinationCity: destino,
        vehicleType: veiculo,
        distanceKm: km ? parseFloat(km) : undefined,
        urgent: urgente,
      };

      Monetization.api.logisticsQuote(payload)
        .then(r => {
          const d = r.data;
          const res = document.getElementById('rebResultado');
          const card = document.getElementById('rebResultadoCard');
          if (!res || !card) return;

          const tipoLabel = tipo === 'TOW' ? 'Guincho/Reboque' : 'Transporte de Veículo';
          const urgLabel  = urgente ? '<span style="color:#f59e0b"> · ⚡ Urgente (+35%)</span>' : '';

          card.innerHTML = `
            <div class="px-card-title">◈ SUA COTAÇÃO — ${tipoLabel}${urgLabel}</div>
            <div class="px-rota">
              <span class="px-rota-cidade">${origem}</span>
              <span class="px-rota-seta">→</span>
              <span class="px-rota-cidade">${destino}</span>
              <span class="px-rota-km">${d.distanceKm} km</span>
            </div>
            <div class="px-preco-range">
              <div class="px-preco-label">Estimativa de custo</div>
              <div class="px-preco-vals">
                <span>${fmtBRL(d.estimatedCost.min)}</span>
                <span class="px-preco-sep">até</span>
                <span class="px-preco-max">${fmtBRL(d.estimatedCost.max)}</span>
              </div>
            </div>
            <div class="px-info-grid">
              <div class="px-info-item"><div class="px-info-label">Tempo estimado</div><div class="px-info-val">⏱ ${d.estimatedTime}</div></div>
              <div class="px-info-item"><div class="px-info-label">Veículo</div><div class="px-info-val">🚗 ${veiculo}</div></div>
            </div>
            ${d.providers?.length ? `
            <div class="px-card-title" style="margin:16px 0 10px">PARCEIROS DISPONÍVEIS</div>
            ${d.providers.map(p => `
              <div class="px-provider-row">
                <div>
                  <div style="font-weight:600;color:#fff;font-size:.88rem">${p.name}</div>
                  <div style="font-size:.75rem;color:var(--muted)">${p.type} · ${p.contact}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-family:'JetBrains Mono',monospace;color:#10b981;font-weight:700">${fmtBRL(p.estimatedCost)}</div>
                  <button class="px-btn px-btn--sm" style="margin-top:6px" onclick="PagesExtra.confirmarReboque('${p.name}')">Contratar</button>
                </div>
              </div>`).join('')}` : ''}
            ${d.tips?.length ? `<div class="px-tips">${d.tips.map(t=>`<div class="px-tip">💡 ${t}</div>`).join('')}</div>` : ''}
            ${d.emergencyContacts?.length ? `<div class="px-emergency">${d.emergencyContacts.map(c=>`<div>📞 ${c}</div>`).join('')}</div>` : ''}
          `;
          res.style.display = 'block';
          res.scrollIntoView({ behavior:'smooth' });
          Toast.show('✅ Cotação calculada!','ok');
        })
        .catch(e => {
          Toast.show(e.message || 'Erro ao calcular cotação.','err');
        })
        .finally(() => {
          if (btn) { btn.disabled = false; btn.textContent = '🚛 CALCULAR COTAÇÃO'; }
        });
    },

    confirmarReboque(parceiro) {
      authGuard(() => {
        Toast.show(`🚛 Solicitação enviada para ${parceiro}! Aguarde o contato.`, 'ok', 5000);
      });
    },

    // CHAVEIRO: chama POST /monetization/quotes com vertical SERVICE
    solicitarChaveiro() {
      authGuard(() => {
        const cidade = document.getElementById('chavCidade')?.value?.trim();
        const estado = document.getElementById('chavEstado')?.value?.trim().toUpperCase();
        const tipo   = document.getElementById('chavTipo')?.value;
        const desc   = document.getElementById('chavDesc')?.value?.trim();

        if (!cidade || !estado) { Toast.show('Informe cidade e estado.','err'); return; }
        if (!desc)               { Toast.show('Descreva o serviço necessário.','err'); return; }

        const tipoLabels = {
          abertura:'Abertura de porta', copia:'Cópia de chave',
          codificada:'Chave codificada/transponder', ignicao:'Reparo de ignição', keyfob:'Programação de controle',
        };
        const descCompleta = `[${tipoLabels[tipo]||tipo}] ${desc} — ${cidade}/${estado}`;

        const btn = document.getElementById('chavBtnSol');
        if (btn) { btn.disabled = true; btn.textContent = '⟳ Enviando...'; }

        Monetization.api.createQuote({
          vertical: 'SERVICE',
          description: descCompleta,
        })
          .then(r => {
            const fb = document.getElementById('chavFeedback');
            if (fb) {
              fb.style.display = 'block';
              fb.innerHTML = `
                <div class="px-success-box">
                  <div style="font-size:1.6rem;margin-bottom:8px">✅</div>
                  <div style="font-weight:700;color:#10b981;margin-bottom:4px">Cotação enviada com sucesso!</div>
                  <div style="font-size:.8rem;color:var(--muted)">ID da solicitação: <code style="color:#a78bfa">${r.data?.id || '—'}</code></div>
                  <div style="font-size:.8rem;color:var(--muted);margin-top:6px">Um chaveiro parceiro da sua região entrará em contato em breve.</div>
                </div>`;
              fb.scrollIntoView({ behavior:'smooth' });
            }
            Toast.show('🔑 Cotação enviada! Aguarde o contato do parceiro.','ok', 5000);
          })
          .catch(e => {
            Toast.show(e.message || 'Erro ao enviar cotação.','err');
          })
          .finally(() => {
            if (btn) { btn.disabled = false; btn.textContent = '🔑 SOLICITAR CHAVEIRO AGORA'; }
          });
      });
    },

    // ALUGUEL: busca GET /monetization/providers?vertical=RENTAL
    buscarLocadoras() {
      const cidade = document.getElementById('algCidade')?.value?.trim();
      const estado = document.getElementById('algEstado')?.value?.trim().toUpperCase();
      if (!cidade) { Toast.show('Informe a cidade.','err'); return; }

      Toast.show('🔍 Buscando locadoras...','info');

      const params = new URLSearchParams({ vertical: 'RENTAL', ...(cidade && { city: cidade }), ...(estado && { state: estado }) });
      Monetization.api.providers(`?${params}`)
        .then(r => {
          const res     = document.getElementById('algResultado');
          const cards   = document.getElementById('algCards');
          const empty   = document.getElementById('algEmpty');
          if (!res||!cards||!empty) return;

          const providers = r.data?.providers || [];
          res.style.display = 'block';

          if (!providers.length) {
            cards.innerHTML = '';
            empty.style.display = 'block';
            res.scrollIntoView({ behavior:'smooth' });
            return;
          }

          empty.style.display = 'none';
          cards.innerHTML = providers.map(p => `
            <div class="px-provider-card">
              <div class="px-provider-top">
                <div>
                  <div class="px-provider-name">${p.name}</div>
                  <div class="px-provider-loc">📍 ${p.city}${p.state ? '/' + p.state : ''}</div>
                  ${p.description ? `<div class="px-provider-desc">${p.description}</div>` : ''}
                </div>
                <div style="text-align:right;flex-shrink:0">
                  ${p.ratingAvg ? `<div style="color:#f59e0b;font-size:.88rem">★ ${parseFloat(p.ratingAvg).toFixed(1)}</div>` : ''}
                  ${p.emergency24h ? `<div class="px-badge-24h">24h</div>` : ''}
                </div>
              </div>
              ${p.phone || p.email ? `
              <div class="px-provider-contacts">
                ${p.phone ? `<a href="tel:${p.phone}" class="px-contact-btn">📞 ${p.phone}</a>` : ''}
                ${p.email ? `<a href="mailto:${p.email}" class="px-contact-btn">✉️ ${p.email}</a>` : ''}
              </div>` : ''}
              <button class="px-btn px-btn--sm" style="width:100%;margin-top:10px" onclick="PagesExtra.reservarLocadora('${p.id}','${p.name.replace(/'/g,'')}')">
                Solicitar cotação
              </button>
            </div>`).join('');

          res.scrollIntoView({ behavior:'smooth' });
          Toast.show(`✅ ${providers.length} locadora(s) encontrada(s)!`,'ok');
        })
        .catch(e => {
          Toast.show(e.message || 'Erro ao buscar locadoras.','err');
        });
    },

    reservarLocadora(providerId, nome) {
      authGuard(() => {
        Monetization.api.createQuote({
          vertical: 'RENTAL',
          providerId,
          description: `Solicitação de aluguel de veículo — ${nome}`,
        })
          .then(r => {
            Toast.show(`🗝️ Cotação enviada para ${nome}! ID: ${r.data?.id || '—'}`, 'ok', 5000);
          })
          .catch(e => Toast.show(e.message || 'Erro ao enviar solicitação.','err'));
      });
    },

    reservarCarro(cat) {
      authGuard(() => {
        Toast.show(`🗝️ Busque uma locadora acima para reservar categoria ${cat}.`,'info');
      });
    },

    cadastrarLocadora() {
      authGuard(() => {
        Toast.show('Para cadastrar sua locadora, acesse o painel de parceiros.','info', 5000);
      });
    },
  };

  window.PagesExtra = PagesExtra;
  PagesExtra.renderReboque  = renderReboque;
  PagesExtra.renderChaveiro = renderChaveiro;
  PagesExtra.renderAluguel  = renderAluguel;

  // ── CSS ────────────────────────────────────────────────────
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
.px-card--highlight{border-color:rgba(124,58,237,.4);background:rgba(124,58,237,.06)}
.px-card-title{font-family:'Bebas Neue',sans-serif;letter-spacing:2px;font-size:1rem;color:var(--muted,#888);margin-bottom:14px}
.px-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:16px}
.px-form-col{display:flex;flex-direction:column;gap:14px;margin-bottom:16px}
.px-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.px-form-group{display:flex;flex-direction:column;gap:6px}
.px-form-group label{font-size:.78rem;color:var(--muted,#888)}
.px-input{background:var(--s1,rgba(255,255,255,.03));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:8px;padding:10px 12px;color:#fff;font-size:.84rem;font-family:'Space Grotesk',sans-serif;width:100%;box-sizing:border-box}
.px-input option{background:#1a1a2e;color:#fff}
.px-btn{background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:10px;padding:12px 20px;color:#fff;font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1.5px;cursor:pointer;width:100%;transition:opacity .15s}
.px-btn:disabled{opacity:.5;cursor:not-allowed}
.px-btn--sm{width:auto;padding:8px 14px;font-size:.82rem}
.px-btn--purple{background:linear-gradient(135deg,#6d28d9,#a855f7)}
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
/* cotação reboque */
.px-rota{display:flex;align-items:center;gap:10px;margin:12px 0;flex-wrap:wrap}
.px-rota-cidade{font-weight:700;color:#fff;font-size:.95rem}
.px-rota-seta{color:var(--muted,#888)}
.px-rota-km{font-size:.78rem;color:var(--muted,#888);margin-left:auto}
.px-preco-range{background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.25);border-radius:12px;padding:14px;margin:12px 0;text-align:center}
.px-preco-label{font-size:.75rem;color:var(--muted,#888);margin-bottom:6px}
.px-preco-vals{display:flex;align-items:center;justify-content:center;gap:10px}
.px-preco-vals span{font-family:'JetBrains Mono',monospace;font-size:1.1rem;color:#10b981;font-weight:700}
.px-preco-sep{font-size:.82rem;color:var(--muted,#888);font-family:'Space Grotesk',sans-serif;font-weight:400}
.px-preco-max{color:#a78bfa !important}
.px-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
.px-info-item{background:rgba(255,255,255,.04);border-radius:8px;padding:10px}
.px-info-label{font-size:.72rem;color:var(--muted,#888);margin-bottom:4px}
.px-info-val{font-size:.88rem;color:#fff;font-weight:600}
.px-provider-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.px-provider-row:last-child{border-bottom:none}
.px-tips{display:flex;flex-direction:column;gap:6px;margin-top:14px}
.px-tip{font-size:.78rem;color:var(--muted,#888);padding:8px 12px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.15);border-radius:8px}
.px-emergency{margin-top:10px;font-size:.8rem;color:#ef4444;display:flex;flex-direction:column;gap:4px}
/* provider cards aluguel */
.px-provider-card{background:var(--s2,rgba(255,255,255,.05));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:14px;margin-bottom:10px}
.px-provider-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px}
.px-provider-name{font-weight:700;color:#fff;font-size:.92rem}
.px-provider-loc{font-size:.75rem;color:var(--muted,#888);margin-top:2px}
.px-provider-desc{font-size:.78rem;color:var(--muted,#888);margin-top:4px}
.px-provider-contacts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.px-contact-btn{font-size:.78rem;padding:6px 12px;background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.25);border-radius:6px;color:#a78bfa;text-decoration:none}
.px-badge-24h{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#10b981;font-size:.68rem;font-weight:700;padding:3px 8px;border-radius:20px;margin-top:4px;display:inline-block}
/* success box chaveiro */
.px-success-box{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:18px;text-align:center}
@media(max-width:480px){.px-form-row{grid-template-columns:1fr}.px-grid2{grid-template-columns:1fr 1fr}.px-info-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

})();
