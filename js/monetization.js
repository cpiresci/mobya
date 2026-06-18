// ============================================================
// MOBYA — Módulo de Monetização Frontend v1.0
// Arquivo: js/monetization.js
//
// Como usar: adicione no index.html ANTES do </body>:
//   <script src="js/monetization.js"></script>
//
// E no HTML, adicione no sidebar (bloco .sb-sec "Plataforma"):
//   <div class="sb-item" data-page="monetizacao">💰 Rede de Parceiros</div>
//   <div class="sb-item" data-page="painel-receita">📊 Painel de Receita</div>
//
// E na <nav id="nav">:
//   <button class="nb" data-page="monetizacao">Parceiros</button>
//
// No app.js / main navigation handler, o sistema de pages
// já detecta data-page e chama renderPage(page), então
// apenas registre as pages abaixo.
// ============================================================

window.Monetization = (() => {

  // ── CONSTANTES ────────────────────────────────────────────
  const VERTICAL_META = {
    SERVICE: {
      icon: '🔧', label: 'Serviços Auto',
      color: 'var(--q3)', bg: 'rgba(168,85,247,.12)',
      border: 'rgba(168,85,247,.3)',
      rate: '10%',
      desc: 'Oficinas, concessionárias, auto centers, chaveiros, elétricos, borracheiros',
    },
    RENTAL: {
      icon: '🗝️', label: 'Locação de Veículos',
      color: 'var(--neon)', bg: 'rgba(0,245,255,.09)',
      border: 'rgba(0,245,255,.25)',
      rate: '5%',
      desc: 'Localiza, Unidas, Movida, Hertz, Avis, frotas PJ',
    },
    LOGISTICS: {
      icon: '🚛', label: 'Fretes & Reboques',
      color: 'var(--gold)', bg: 'rgba(251,191,36,.1)',
      border: 'rgba(251,191,36,.3)',
      rate: '10%',
      desc: 'Fretes, guincho, reboques, entrega de auto peças novas',
    },
    INSURANCE: {
      icon: '🛡️', label: 'Seguros & Consórcios',
      color: 'var(--green)', bg: 'rgba(16,185,129,.09)',
      border: 'rgba(16,185,129,.25)',
      rate: 'variável',
      desc: 'Seguros auto, vida, garantia mecânica, consórcios',
    },
  };

  const INSURANCE_PRODUCTS = {
    AUTO_FULL:        { label: 'Seguro Auto Completo',        rate: '8%' },
    AUTO_POPULAR:     { label: 'Seguro Popular / Terceiros',  rate: '6%' },
    LIFE:             { label: 'Seguro de Vida',              rate: '5%' },
    GUARANTEED:       { label: 'Garantia Mecânica Extendida', rate: '4%' },
    CONSORTIUM_AUTO:  { label: 'Consórcio Automotivo',        rate: '2.5%' },
    CONSORTIUM_MOTO:  { label: 'Consórcio Moto',              rate: '2.5%' },
  };

  // ── UTILITÁRIOS ───────────────────────────────────────────
  const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtNum = v => parseInt(v||0).toLocaleString('pt-BR');

  function toast(msg, type = 'ok') {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:28px;right:28px;z-index:9999;padding:12px 20px;border-radius:8px;
      font-family:'Space Grotesk',sans-serif;font-size:.83rem;font-weight:500;max-width:340px;
      background:${type==='ok'?'rgba(16,185,129,.15)':type==='err'?'rgba(244,63,94,.15)':'rgba(251,191,36,.12)'};
      border:1px solid ${type==='ok'?'rgba(16,185,129,.4)':type==='err'?'rgba(244,63,94,.4)':'rgba(251,191,36,.35)'};
      color:${type==='ok'?'var(--green)':type==='err'?'var(--red)':'var(--gold)'};
      backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,.4);
      animation:slideIn .3s ease`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }

  function loading(el, on) {
    if (!el) return;
    el.disabled = on;
    el.style.opacity = on ? '.5' : '1';
  }

  // ── API CALLS ─────────────────────────────────────────────
  const api = {
    providers:         (q='')  => API.get(`/monetization/providers${q}`),
    rates:             ()      => API.get('/monetization/rates'),
    dashboard:         ()      => API.get('/monetization/dashboard'),
    commSummary:       ()      => API.get('/monetization/commissions/summary'),
    quotesMine:        (p='')  => API.get(`/monetization/quotes/mine${p}`),
    commsMine:         ()      => API.get('/monetization/commissions/mine'),
    registerProvider:  (d)     => API.post('/monetization/providers', d),
    createQuote:       (d)     => API.post('/monetization/quotes', d),
    acceptQuote:       (id, d) => API.patch(`/monetization/quotes/${id}/accept`, d),
    completeQuote:     (id, d) => API.patch(`/monetization/quotes/${id}/complete`, d),
    insuranceSim:      (d)     => API.post('/monetization/insurance/simulate', d),
    logisticsQuote:    (d)     => API.post('/monetization/logistics/quote', d),
    payCommission:     (id, d) => API.post(`/monetization/commissions/${id}/pay`, d),
  };

  // ═══════════════════════════════════════════════════════════
  // PAGE: REDE DE PARCEIROS (usuário/público)
  // ═══════════════════════════════════════════════════════════
  async function renderPartnersPage() {
    const main = document.getElementById('main');
    if (!main) return;

    main.innerHTML = `
      <div style="margin-bottom:28px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;
          background:linear-gradient(135deg,#fff,var(--q4),var(--neon));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent">
          REDE MOBYA DE PARCEIROS
        </div>
        <div style="color:var(--muted);font-size:.84rem;margin-top:4px">
          Concessionárias · Oficinas · Locadoras · Fretes · Seguros & Consórcios
        </div>
      </div>

      <!-- VERTICAIS CARDS -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:32px" id="verticalCards">
        ${Object.entries(VERTICAL_META).map(([k,v]) => `
          <div onclick="Monetization.filterByVertical('${k}')" style="
            background:${v.bg};border:1px solid ${v.border};border-radius:12px;
            padding:18px;cursor:pointer;transition:all .18s;position:relative;overflow:hidden"
            onmouseover="this.style.transform='translateY(-3px)'"
            onmouseout="this.style.transform='translateY(0)'">
            <div style="font-size:1.8rem;margin-bottom:10px">${v.icon}</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.15rem;letter-spacing:2px;color:${v.color}">${v.label}</div>
            <div style="font-size:.73rem;color:var(--muted);margin:5px 0 10px;line-height:1.4">${v.desc}</div>
            <div style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:.65rem;
              padding:3px 10px;border-radius:4px;background:rgba(0,0,0,.3);color:${v.color};border:1px solid ${v.border}">
              Comissão MOBYA: ${v.rate}
            </div>
          </div>`).join('')}
      </div>

      <!-- FILTROS + BUSCA -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
        <input id="srchCity" placeholder="🏙️ Cidade..." style="
          background:var(--s3);border:1px solid var(--border);color:var(--text);
          padding:9px 14px;border-radius:8px;font-family:'Space Grotesk',sans-serif;
          font-size:.82rem;width:180px;outline:none">
        <select id="srchVertical" style="
          background:var(--s3);border:1px solid var(--border);color:var(--text);
          padding:9px 14px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
          <option value="">Todas as verticais</option>
          ${Object.entries(VERTICAL_META).map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
        </select>
        <select id="srchEmergency" style="
          background:var(--s3);border:1px solid var(--border);color:var(--text);
          padding:9px 14px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
          <option value="">Todos</option>
          <option value="true">🚨 24h / Emergência</option>
        </select>
        <button onclick="Monetization.searchProviders()" style="
          background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
          padding:9px 22px;border-radius:8px;font-weight:600;font-size:.82rem;
          border:none;cursor:pointer;box-shadow:0 0 16px rgba(124,58,237,.3)">
          Buscar
        </button>
        <button onclick="Monetization.showRegisterPartner()" style="
          background:rgba(16,185,129,.12);color:var(--green);border:1px solid rgba(16,185,129,.3);
          padding:9px 18px;border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer;margin-left:auto">
          + Cadastrar Parceiro
        </button>
      </div>

      <!-- RESULTADOS -->
      <div id="providersList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        <div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;padding:32px;text-align:center;grid-column:1/-1">
          🔍 Use os filtros acima para buscar parceiros cadastrados...
        </div>
      </div>

      <!-- MODAL COTAÇÃO -->
      <div id="quoteModal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.75);
        backdrop-filter:blur(8px);align-items:center;justify-content:center">
        <div id="quoteContent" style="background:var(--s2);border:1px solid var(--border2);border-radius:16px;
          padding:32px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;position:relative"></div>
      </div>
    `;

    // Auto-busca ao digitar cidade
    document.getElementById('srchCity')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') searchProviders();
    });
  }

  function filterByVertical(v) {
    const sel = document.getElementById('srchVertical');
    if (sel) sel.value = v;
    searchProviders();
  }

  async function searchProviders() {
    const city      = document.getElementById('srchCity')?.value?.trim() || '';
    const vertical  = document.getElementById('srchVertical')?.value    || '';
    const emergency = document.getElementById('srchEmergency')?.value   || '';
    const list      = document.getElementById('providersList');
    if (!list) return;

    list.innerHTML = `<div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;
      padding:32px;text-align:center;grid-column:1/-1">⟳ Buscando parceiros...</div>`;

    try {
      const params = new URLSearchParams();
      if (city)      params.append('city', city);
      if (vertical)  params.append('vertical', vertical);
      if (emergency) params.append('emergency24h', 'true');
      params.append('limit', '24');

      const r = await api.providers('?' + params.toString());
      const providers = r?.data?.providers || [];

      if (!providers.length) {
        list.innerHTML = `<div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;
          padding:48px;text-align:center;grid-column:1/-1">
          Nenhum parceiro encontrado. <br>
          <button onclick="Monetization.showRegisterPartner()" style="
            margin-top:14px;background:rgba(124,58,237,.15);color:var(--q4);
            border:1px solid rgba(124,58,237,.3);padding:8px 18px;border-radius:8px;
            cursor:pointer;font-size:.8rem">Seja o primeiro da sua cidade!</button>
        </div>`;
        return;
      }

      list.innerHTML = providers.map(p => providerCard(p)).join('');
    } catch (e) {
      list.innerHTML = `<div style="color:var(--red);padding:32px;text-align:center;grid-column:1/-1">
        ⚠️ ${e.message || 'Erro ao buscar parceiros.'}</div>`;
    }
  }

  function providerCard(p) {
    const vm = VERTICAL_META[p.vertical] || VERTICAL_META.SERVICE;
    const stars = '★'.repeat(Math.round(p.ratingAvg||0)) + '☆'.repeat(5-Math.round(p.ratingAvg||0));
    return `
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;
        padding:20px;transition:all .18s;cursor:pointer"
        onmouseover="this.style.borderColor='${vm.border}';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
          <div style="width:44px;height:44px;border-radius:10px;background:${vm.bg};border:1px solid ${vm.border};
            display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">
            ${p.logo ? `<img src="${p.logo}" style="width:36px;height:36px;border-radius:6px;object-fit:cover">` : vm.icon}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.93rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
            <div style="font-size:.73rem;color:var(--muted);margin-top:2px">${p.city}/${p.state}</div>
          </div>
          ${p.emergency24h ? `<span style="font-family:'JetBrains Mono',monospace;font-size:.55rem;
            padding:3px 7px;border-radius:4px;background:rgba(244,63,94,.15);color:var(--red);
            border:1px solid rgba(244,63,94,.3);white-space:nowrap">🚨 24H</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-family:'JetBrains Mono',monospace;font-size:.65rem;
            padding:2px 8px;border-radius:4px;background:${vm.bg};color:${vm.color};border:1px solid ${vm.border}">
            ${vm.icon} ${vm.label}
          </span>
          ${p.category ? `<span style="font-size:.68rem;color:var(--muted)">${p.category.replace(/_/g,' ')}</span>` : ''}
        </div>
        ${p.description ? `<div style="font-size:.76rem;color:var(--muted);line-height:1.45;margin-bottom:12px;
          overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
          ${p.description}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:var(--gold);font-size:.85rem;letter-spacing:-1px">${stars}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:.63rem;color:var(--muted)">
              ${(p.ratingAvg||0).toFixed(1)} (${fmtNum(p.ratingCount)})
            </span>
          </div>
          <button onclick="Monetization.openQuoteModal('${p.id}','${p.name}','${p.vertical}')" style="
            background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
            padding:7px 16px;border-radius:7px;font-size:.76rem;font-weight:600;
            border:none;cursor:pointer;box-shadow:0 0 12px rgba(124,58,237,.3)">
            Solicitar Cotação
          </button>
        </div>
      </div>`;
  }

  // ── MODAL COTAÇÃO ─────────────────────────────────────────
  function openQuoteModal(providerId, providerName, vertical) {
    const modal   = document.getElementById('quoteModal');
    const content = document.getElementById('quoteContent');
    if (!modal || !content) return;

    const vm = VERTICAL_META[vertical] || VERTICAL_META.SERVICE;

    content.innerHTML = `
      <button onclick="Monetization.closeQuoteModal()" style="
        position:absolute;top:16px;right:16px;background:none;border:none;
        color:var(--muted);font-size:1.2rem;cursor:pointer">✕</button>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:3px;margin-bottom:4px">
        SOLICITAR COTAÇÃO</div>
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:20px">
        ${vm.icon} ${providerName}</div>

      <div style="margin-bottom:14px">
        <label style="font-size:.76rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
          letter-spacing:1px;display:block;margin-bottom:6px">DESCRIÇÃO DO SERVIÇO *</label>
        <textarea id="qdesc" rows="3" placeholder="Ex: Troca de pastilhas de freio, revisão 10.000km, alinhamento e balanceamento..." style="
          width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
          padding:10px 14px;border-radius:8px;font-family:'Space Grotesk',sans-serif;
          font-size:.82rem;outline:none;resize:vertical"></textarea>
      </div>

      ${vertical === 'INSURANCE' ? `
      <div style="margin-bottom:14px">
        <label style="font-size:.76rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
          letter-spacing:1px;display:block;margin-bottom:6px">PRODUTO DE SEGURO</label>
        <select id="qinsProduct" style="width:100%;background:var(--s3);border:1px solid var(--border);
          color:var(--text);padding:10px 14px;border-radius:8px;font-size:.82rem;outline:none">
          ${Object.entries(INSURANCE_PRODUCTS).map(([k,v]) =>
            `<option value="${k}">${v.label} — comissão ${v.rate}</option>`
          ).join('')}
        </select>
      </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <label style="font-size:.76rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:6px">VALOR ESTIMADO (R$)</label>
          <input id="qamount" type="number" placeholder="Ex: 350.00" style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:10px 14px;border-radius:8px;font-size:.82rem;outline:none">
        </div>
        <div>
          <label style="font-size:.76rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:6px">AGENDAR PARA</label>
          <input id="qdate" type="datetime-local" style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:10px 14px;border-radius:8px;font-size:.82rem;outline:none;color-scheme:dark">
        </div>
      </div>

      <div id="qCommPreview" style="
        background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);
        border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:.78rem;
        font-family:'JetBrains Mono',monospace;color:var(--green);display:none">
      </div>

      <button id="qSubmitBtn" onclick="Monetization.submitQuote('${providerId}','${vertical}')" style="
        width:100%;background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
        padding:12px;border-radius:8px;font-weight:700;font-size:.88rem;
        border:none;cursor:pointer;box-shadow:0 0 20px rgba(124,58,237,.4)">
        📩 ENVIAR COTAÇÃO
      </button>
    `;

    modal.style.display = 'flex';

    // Preview de comissão em tempo real
    document.getElementById('qamount')?.addEventListener('input', e => {
      const val  = parseFloat(e.target.value) || 0;
      const prev = document.getElementById('qCommPreview');
      if (!prev) return;
      if (val > 0) {
        const rate    = vertical === 'RENTAL' ? 0.05 : 0.10;
        const comm    = (val * rate).toFixed(2);
        prev.style.display = 'block';
        prev.innerHTML = `💰 Comissão MOBYA estimada: <strong>R$ ${parseFloat(comm).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong> (${(rate*100).toFixed(0)}% de R$ ${val.toLocaleString('pt-BR',{minimumFractionDigits:2})})`;
      } else {
        prev.style.display = 'none';
      }
    });
  };

  function closeQuoteModal() {
    const modal = document.getElementById('quoteModal');
    if (modal) modal.style.display = 'none';
  };

  async function submitQuote(providerId, vertical) {
    const btn  = document.getElementById('qSubmitBtn');
    const desc = document.getElementById('qdesc')?.value?.trim();
    const amt  = document.getElementById('qamount')?.value;
    const dt   = document.getElementById('qdate')?.value;
    const ins  = document.getElementById('qinsProduct')?.value;

    if (!desc) return toast('Descreva o serviço necessário.', 'warn');
    loading(btn, true);
    try {
      await api.createQuote({
        providerId, vertical, description: desc,
        estimatedAmount: amt  || undefined,
        scheduledAt:     dt   || undefined,
        insuranceProduct: ins || undefined,
      });
      window.Monetization.closeQuoteModal();
      toast('📩 Cotação enviada! O parceiro entrará em contato.', 'ok');
    } catch (e) {
      toast(e.message || 'Erro ao enviar cotação.', 'err');
    } finally {
      loading(btn, false);
    }
  };

  // ── MODAL CADASTRO DE PARCEIRO ────────────────────────────
  function showRegisterPartner() {
    if (!API.isAuth()) {
      toast('Faça login para cadastrar seu negócio.', 'warn');
      window.MobyaAuth?.showLogin();
      return;
    }
    const modal   = document.getElementById('quoteModal');
    const content = document.getElementById('quoteContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <button onclick="Monetization.closeQuoteModal()" style="
        position:absolute;top:16px;right:16px;background:none;border:none;
        color:var(--muted);font-size:1.2rem;cursor:pointer">✕</button>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:3px;margin-bottom:4px">
        CADASTRAR PARCEIRO</div>
      <div style="font-size:.78rem;color:var(--muted);margin-bottom:20px;line-height:1.5">
        Integre seu negócio à rede MOBYA e receba leads qualificados de motoristas da sua região.</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="grid-column:1/-1">
          <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:5px">NOME DO NEGÓCIO *</label>
          <input id="rp_name" placeholder="Ex: Auto Center Silva" style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
        </div>
        <div>
          <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:5px">VERTICAL *</label>
          <select id="rp_vertical" onchange="Monetization.onVerticalChange()" style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
            ${Object.entries(VERTICAL_META).map(([k,v]) =>
              `<option value="${k}">${v.icon} ${v.label}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:5px">CNPJ</label>
          <input id="rp_cnpj" placeholder="00.000.000/0001-00" style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
        </div>
        <div>
          <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:5px">CIDADE *</label>
          <input id="rp_city" placeholder="São Paulo" style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
        </div>
        <div>
          <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:5px">ESTADO *</label>
          <input id="rp_state" maxlength="2" placeholder="SP" style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
        </div>
        <div>
          <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:5px">TELEFONE / WHATSAPP</label>
          <input id="rp_phone" placeholder="(11) 99999-9999" style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
        </div>
        <div style="grid-column:1/-1">
          <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;display:block;margin-bottom:5px">DESCRIÇÃO DO NEGÓCIO</label>
          <textarea id="rp_desc" rows="2" placeholder="Especialidades, diferenciais, anos de experiência..." style="
            width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
            padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;resize:vertical"></textarea>
        </div>
      </div>

      <label style="display:flex;align-items:center;gap:8px;font-size:.8rem;color:var(--muted);
        cursor:pointer;margin-bottom:18px">
        <input id="rp_emergency" type="checkbox" style="accent-color:var(--q3)">
        🚨 Atendimento 24h / Emergência
      </label>

      <div id="rp_commPreview" style="background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.2);
        border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:.76rem;
        font-family:'JetBrains Mono',monospace;color:var(--q4)">
        💡 Vertical SERVICE: comissão de 10% sobre cada serviço fechado via MOBYA.
      </div>

      <button id="rpSubmitBtn" onclick="Monetization.submitRegisterPartner()" style="
        width:100%;background:linear-gradient(135deg,var(--green),rgba(16,185,129,.7));color:#fff;
        padding:12px;border-radius:8px;font-weight:700;font-size:.88rem;
        border:none;cursor:pointer;box-shadow:0 0 20px rgba(16,185,129,.3)">
        ✅ ENVIAR CADASTRO
      </button>
      <div style="font-size:.71rem;color:var(--muted);text-align:center;margin-top:10px">
        Análise em até 48h · Sem custo de adesão · Cancele quando quiser
      </div>
    `;

    modal.style.display = 'flex';
  };

  function onVerticalChange() {
    const v    = document.getElementById('rp_vertical')?.value;
    const prev = document.getElementById('rp_commPreview');
    if (!prev || !v) return;
    const vm = VERTICAL_META[v];
    prev.innerHTML = `💡 Vertical ${vm.label}: comissão de <strong>${vm.rate}</strong> sobre cada negócio fechado via MOBYA.`;
  };

  async function submitRegisterPartner() {
    const btn  = document.getElementById('rpSubmitBtn');
    const name = document.getElementById('rp_name')?.value?.trim();
    const vert = document.getElementById('rp_vertical')?.value;
    const city = document.getElementById('rp_city')?.value?.trim();
    const state= document.getElementById('rp_state')?.value?.trim().toUpperCase();
    if (!name || !city || !state) return toast('Preencha nome, cidade e estado.', 'warn');

    loading(btn, true);
    try {
      await api.registerProvider({
        name, vertical: vert, city, state,
        cnpj:        document.getElementById('rp_cnpj')?.value?.trim()  || undefined,
        phone:       document.getElementById('rp_phone')?.value?.trim() || undefined,
        description: document.getElementById('rp_desc')?.value?.trim()  || undefined,
        emergency24h: document.getElementById('rp_emergency')?.checked  || false,
      });
      window.Monetization.closeQuoteModal();
      toast('✅ Cadastro enviado! Nossa equipe analisará em até 48h.', 'ok');
    } catch (e) {
      toast(e.message || 'Erro ao enviar cadastro.', 'err');
    } finally {
      loading(btn, false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // PAGE: SIMULADOR DE SEGURO
  // ═══════════════════════════════════════════════════════════
  async function renderInsurancePage() {
    const main = document.getElementById('main');
    if (!main) return;

    main.innerHTML = `
      <div style="margin-bottom:28px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;
          background:linear-gradient(135deg,#fff,var(--green),var(--neon));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent">
          SIMULADOR DE SEGUROS IA
        </div>
        <div style="color:var(--muted);font-size:.84rem;margin-top:4px">
          Score de risco · Comparativo de seguradoras · Comissão MOBYA transparente
        </div>
      </div>

      <div style="display:grid;grid-template-columns:400px 1fr;gap:24px;align-items:start">
        <!-- FORM -->
        <div style="background:var(--s2);border:1px solid var(--border);border-radius:14px;padding:24px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:2px;
            color:var(--green);margin-bottom:18px">⬡ DADOS DO VEÍCULO E CONDUTOR</div>

          ${[
            ['insBrand','Marca do veículo','text','Ex: Toyota'],
            ['insModel','Modelo','text','Ex: Corolla XEi'],
            ['insYear','Ano do modelo','number','Ex: 2021'],
            ['insValue','Valor de mercado (R$)','number','Ex: 85000'],
          ].map(([id,label,type,ph]) => `
            <div style="margin-bottom:13px">
              <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                letter-spacing:1px;display:block;margin-bottom:5px">${label.toUpperCase()}</label>
              <input id="${id}" type="${type}" placeholder="${ph}" style="
                width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
            </div>`).join('')}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px">
            <div>
              <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                letter-spacing:1px;display:block;margin-bottom:5px">CIDADE PRINCIPAL</label>
              <input id="insCity" placeholder="São Paulo" style="
                width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
            </div>
            <div>
              <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                letter-spacing:1px;display:block;margin-bottom:5px">ESTADO</label>
              <input id="insState" maxlength="2" placeholder="SP" style="
                width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
            </div>
          </div>

          <div style="margin-bottom:13px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">IDADE DO PRINCIPAL CONDUTOR</label>
            <input id="insAge" type="number" placeholder="35" style="
              width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>

          <div style="margin-bottom:18px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">PRODUTO</label>
            <select id="insProduct" style="
              width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              ${Object.entries(INSURANCE_PRODUCTS).map(([k,v]) =>
                `<option value="${k}">${v.label} — comissão ${v.rate}</option>`
              ).join('')}
            </select>
          </div>

          <button id="insSimBtn" onclick="Monetization.runInsuranceSim()" style="
            width:100%;background:linear-gradient(135deg,rgba(16,185,129,.8),rgba(0,245,255,.6));
            color:var(--ink);padding:12px;border-radius:8px;font-weight:700;
            font-size:.88rem;border:none;cursor:pointer;font-family:'Space Grotesk',sans-serif">
            🛡️ SIMULAR COM IA
          </button>
        </div>

        <!-- RESULTADO -->
        <div id="insResult" style="min-height:200px">
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:14px;padding:48px;
            text-align:center;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem">
            Preencha os dados e clique em Simular para receber o score de risco
            e comparativo das principais seguradoras brasileiras com IA.
          </div>
        </div>
      </div>
    `;
  }

  async function runInsuranceSim() {
    const btn = document.getElementById('insSimBtn');
    const res = document.getElementById('insResult');
    if (!API.isAuth()) { toast('Faça login para simular.', 'warn'); window.MobyaAuth?.showLogin(); return; }

    const brand   = document.getElementById('insBrand')?.value?.trim();
    const model   = document.getElementById('insModel')?.value?.trim();
    const value   = document.getElementById('insValue')?.value;
    if (!brand || !model || !value) return toast('Preencha marca, modelo e valor.', 'warn');

    loading(btn, true);
    res.innerHTML = `<div style="background:var(--s2);border:1px solid var(--border);border-radius:14px;
      padding:48px;text-align:center;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem">
      ⟳ Analisando risco com IA quântica...</div>`;

    try {
      const data = await api.insuranceSim({
        vehicleBrand: brand,
        vehicleModel: model,
        vehicleYear:  document.getElementById('insYear')?.value   || 2020,
        vehicleValue: parseFloat(value),
        driverAge:    document.getElementById('insAge')?.value    || 35,
        driverCity:   document.getElementById('insCity')?.value   || 'São Paulo',
        driverState:  document.getElementById('insState')?.value  || 'SP',
        product:      document.getElementById('insProduct')?.value || 'AUTO_FULL',
      });
      const d = data.data || data;
      renderInsuranceResult(d);
    } catch (e) {
      res.innerHTML = `<div style="background:var(--s2);border:1px solid rgba(244,63,94,.3);
        border-radius:14px;padding:32px;color:var(--red);font-size:.82rem">⚠️ ${e.message}</div>`;
    } finally {
      loading(btn, false);
    }
  };

  function renderInsuranceResult(d) {
    const res   = document.getElementById('insResult');
    const rcolor = d.riskLevel === 'baixo' ? 'var(--green)' : d.riskLevel === 'médio' ? 'var(--gold)' : 'var(--red)';
    const ricon  = d.riskLevel === 'baixo' ? '🟢' : d.riskLevel === 'médio' ? '🟡' : '🔴';

    res.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px">
        <!-- SCORE + PRÊMIO -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          ${[
            { label: 'SCORE DE RISCO', value: `${d.riskScore}/100`, color: rcolor, note: `${ricon} ${d.riskLevel}` },
            { label: 'PRÊMIO ESTIMADO/MÊS', value: `${fmtBRL(d.monthlyPremium?.min)} – ${fmtBRL(d.monthlyPremium?.max)}`, color: 'var(--text)', note: 'Média de mercado' },
            { label: 'COMISSÃO MOBYA/MÊS', value: fmtBRL(d.mobyaCommission?.estimatedMonthly), color: 'var(--green)', note: d.mobyaCommission?.rate || '—' },
          ].map(c => `
            <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center">
              <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);
                letter-spacing:1.5px;margin-bottom:6px">${c.label}</div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:${c.color}">${c.value}</div>
              <div style="font-size:.68rem;color:var(--muted);margin-top:4px">${c.note}</div>
            </div>`).join('')}
        </div>

        <!-- SEGURADORAS -->
        ${d.insurers?.length ? `
        <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
            color:var(--green);margin-bottom:14px">🏢 SEGURADORAS RECOMENDADAS</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${d.insurers.map((ins, i) => `
              <div style="display:flex;align-items:center;justify-content:space-between;
                padding:10px 14px;background:${i===0?'rgba(16,185,129,.07)':'var(--s3)'};
                border-radius:8px;border:1px solid ${i===0?'rgba(16,185,129,.2)':'var(--border)'}">
                <div>
                  <div style="font-weight:600;font-size:.84rem">${i===0?'⭐ ':''}${ins.name}</div>
                  <div style="font-size:.71rem;color:var(--muted);margin-top:2px">${ins.highlight || ''}</div>
                </div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:${i===0?'var(--green)':'var(--text)'}">
                  ${fmtBRL(ins.estimatedPremium)}/mês
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- FATORES DE RISCO -->
        ${d.riskFactors?.length ? `
        <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
            color:var(--muted);margin-bottom:10px">⚠️ FATORES DE RISCO IDENTIFICADOS</div>
          ${d.riskFactors.map(f => `<div style="font-size:.78rem;color:var(--muted);padding:4px 0;
            border-bottom:1px solid var(--border)">• ${f}</div>`).join('')}
        </div>` : ''}

        <!-- DICAS -->
        ${d.savingTips?.length ? `
        <div style="background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:10px;padding:18px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
            color:var(--gold);margin-bottom:10px">💡 DICAS DE ECONOMIA</div>
          ${d.savingTips.map(t => `<div style="font-size:.78rem;color:var(--muted);padding:4px 0">💰 ${t}</div>`).join('')}
        </div>` : ''}

        <button onclick="Monetization.openQuoteModal(null,'Seguro via MOBYA','INSURANCE')" style="
          background:linear-gradient(135deg,rgba(16,185,129,.8),rgba(0,245,255,.5));
          color:var(--ink);padding:12px 24px;border-radius:8px;font-weight:700;font-size:.85rem;
          border:none;cursor:pointer;width:100%">
          🛡️ CONTRATAR AGORA VIA MOBYA
        </button>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // PAGE: COTAÇÃO LOGÍSTICA (FRETES & REBOQUES)
  // ═══════════════════════════════════════════════════════════
  async function renderLogisticsPage() {
    const main = document.getElementById('main');
    if (!main) return;

    main.innerHTML = `
      <div style="margin-bottom:28px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;
          background:linear-gradient(135deg,#fff,var(--gold),var(--orange));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent">
          MOBYA FRETES & REBOQUES
        </div>
        <div style="color:var(--muted);font-size:.84rem;margin-top:4px">
          Fretes automotivos · Guincho 24h · Entrega de peças · Comissão 10% MOBYA
        </div>
      </div>

      <div style="display:grid;grid-template-columns:380px 1fr;gap:24px;align-items:start">
        <div style="background:var(--s2);border:1px solid var(--border);border-radius:14px;padding:24px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:2px;
            color:var(--gold);margin-bottom:18px">⬡ DADOS DA COLETA</div>

          <div style="margin-bottom:13px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">TIPO DE SERVIÇO</label>
            <select id="logType" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              <option value="FREIGHT">🚚 Frete de Veículo / Carga</option>
              <option value="TOW">🪝 Reboque / Guincho</option>
              <option value="PARTS_DELIVERY">📦 Entrega de Auto Peças</option>
            </select>
          </div>

          ${[
            ['logOrigin','Cidade de Origem','text','Ex: São Paulo - SP'],
            ['logDest','Cidade de Destino','text','Ex: Rio de Janeiro - RJ'],
            ['logDist','Distância estimada (km)','number','Ex: 430'],
          ].map(([id,label,type,ph]) => `
            <div style="margin-bottom:13px">
              <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                letter-spacing:1px;display:block;margin-bottom:5px">${label.toUpperCase()}</label>
              <input id="${id}" type="${type}" placeholder="${ph}" style="
                width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
            </div>`).join('')}

          <div style="margin-bottom:13px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">TIPO DE VEÍCULO</label>
            <select id="logVehicle" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
              <option value="Carro">🚗 Carro</option>
              <option value="SUV">🚙 SUV / Utilitário</option>
              <option value="Moto">🏍️ Motocicleta</option>
              <option value="Caminhonete">🛻 Caminhonete / Pickup</option>
              <option value="Caminhão">🚛 Caminhão</option>
              <option value="Peças">📦 Apenas peças/carga</option>
            </select>
          </div>

          <label style="display:flex;align-items:center;gap:8px;font-size:.8rem;color:var(--red);
            cursor:pointer;margin-bottom:18px">
            <input id="logUrgent" type="checkbox" style="accent-color:var(--red)">
            🚨 Urgente / Emergência (sobrepreço pode ser aplicado)
          </label>

          <button id="logSimBtn" onclick="Monetization.runLogisticsSim()" style="
            width:100%;background:linear-gradient(135deg,rgba(251,191,36,.8),rgba(249,115,22,.6));
            color:var(--ink);padding:12px;border-radius:8px;font-weight:700;
            font-size:.88rem;border:none;cursor:pointer">
            🚛 COTAR COM IA
          </button>
        </div>

        <div id="logResult">
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:14px;padding:48px;
            text-align:center;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem">
            Preencha origem, destino e tipo de serviço para receber
            cotação estimada com transportadoras e prestadores da sua rota.
          </div>
        </div>
      </div>
    `;
  }

  async function runLogisticsSim() {
    const btn    = document.getElementById('logSimBtn');
    const result = document.getElementById('logResult');
    if (!API.isAuth()) { toast('Faça login para cotar.', 'warn'); window.MobyaAuth?.showLogin(); return; }

    const origin = document.getElementById('logOrigin')?.value?.trim();
    const dest   = document.getElementById('logDest')?.value?.trim();
    if (!origin || !dest) return toast('Informe origem e destino.', 'warn');

    loading(btn, true);
    result.innerHTML = `<div style="background:var(--s2);border:1px solid var(--border);
      border-radius:14px;padding:48px;text-align:center;color:var(--muted);
      font-family:'JetBrains Mono',monospace;font-size:.73rem">⟳ Calculando melhor rota e custo...</div>`;

    try {
      const data = await api.logisticsQuote({
        type:        document.getElementById('logType')?.value    || 'FREIGHT',
        originCity:  origin, destinationCity: dest,
        distanceKm:  document.getElementById('logDist')?.value    || undefined,
        vehicleType: document.getElementById('logVehicle')?.value || undefined,
        urgent:      document.getElementById('logUrgent')?.checked || false,
      });
      const d = data.data || data;

      result.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
            ${[
              { label: 'CUSTO ESTIMADO', value: `${fmtBRL(d.estimatedCost?.min)} – ${fmtBRL(d.estimatedCost?.max)}`, color: 'var(--gold)' },
              { label: 'PRAZO ESTIMADO', value: d.estimatedTime || '—', color: 'var(--text)' },
              { label: 'TAXA MOBYA (10%)', value: fmtBRL(d.mobyaFee?.estimated), color: 'var(--green)' },
            ].map(c => `
              <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
                padding:16px;text-align:center">
                <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);
                  letter-spacing:1.5px;margin-bottom:6px">${c.label}</div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:${c.color}">${c.value}</div>
              </div>`).join('')}
          </div>

          ${d.providers?.length ? `
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--gold);margin-bottom:14px">🚛 PRESTADORES DISPONÍVEIS</div>
            ${d.providers.map((p,i) => `
              <div style="display:flex;align-items:center;justify-content:space-between;
                padding:10px 14px;background:${i===0?'rgba(251,191,36,.07)':'var(--s3)'};
                border-radius:8px;border:1px solid ${i===0?'rgba(251,191,36,.2)':'var(--border)'};margin-bottom:6px">
                <div>
                  <div style="font-weight:600;font-size:.84rem">${i===0?'⭐ ':''}${p.name}</div>
                  <div style="font-size:.71rem;color:var(--muted)">${p.type || ''} ${p.contact ? '· '+p.contact : ''}</div>
                </div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:${i===0?'var(--gold)':'var(--text)'}">
                  ${fmtBRL(p.estimatedCost)}
                </div>
              </div>`).join('')}
          </div>` : ''}

          ${d.tips?.length ? `
          <div style="background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);
            border-radius:10px;padding:18px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;
              letter-spacing:2px;color:var(--gold);margin-bottom:10px">💡 DICAS</div>
            ${d.tips.map(t => `<div style="font-size:.78rem;color:var(--muted);padding:3px 0">→ ${t}</div>`).join('')}
          </div>` : ''}

          ${d.emergencyContacts?.length ? `
          <div style="background:rgba(244,63,94,.07);border:1px solid rgba(244,63,94,.2);
            border-radius:10px;padding:14px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;
              letter-spacing:2px;color:var(--red);margin-bottom:8px">🚨 CONTATOS DE EMERGÊNCIA</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              ${d.emergencyContacts.map(c => `
                <span style="font-size:.76rem;color:var(--red);background:rgba(244,63,94,.1);
                  padding:4px 10px;border-radius:6px">${c}</span>`).join('')}
            </div>
          </div>` : ''}

          <button onclick="Monetization.openQuoteModal(null,'Frete/Reboque MOBYA','LOGISTICS')" style="
            background:linear-gradient(135deg,rgba(251,191,36,.8),rgba(249,115,22,.6));
            color:var(--ink);padding:12px 24px;border-radius:8px;font-weight:700;
            font-size:.85rem;border:none;cursor:pointer;width:100%">
            🚛 CONTRATAR VIA MOBYA
          </button>
        </div>`;
    } catch (e) {
      result.innerHTML = `<div style="background:var(--s2);border:1px solid rgba(244,63,94,.3);
        border-radius:14px;padding:32px;color:var(--red);font-size:.82rem">⚠️ ${e.message}</div>`;
    } finally {
      loading(btn, false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // PAGE: PAINEL DE RECEITA (ADMIN)
  // ═══════════════════════════════════════════════════════════
  async function renderRevenueDashboard() {
    const main = document.getElementById('main');
    if (!main) return;

    main.innerHTML = `
      <div style="margin-bottom:28px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;
          background:linear-gradient(135deg,var(--gold),var(--neon),var(--q4));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent">
          PAINEL DE RECEITA MOBYA
        </div>
        <div style="color:var(--muted);font-size:.84rem;margin-top:4px">
          Motor de Monetização Quântica · Comissões em tempo real
        </div>
      </div>
      <div id="revDashContent">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
          ${Array(4).fill(0).map((_,i) => `
            <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
              padding:18px;animation:pulse 2s infinite;animation-delay:${i*.15}s">
              <div style="height:10px;background:var(--s3);border-radius:4px;margin-bottom:10px;width:60%"></div>
              <div style="height:28px;background:var(--s3);border-radius:4px;width:80%"></div>
            </div>`).join('')}
        </div>
        <div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;
          text-align:center;padding:20px">⟳ Carregando dashboard...</div>
      </div>
    `;

    try {
      const [dash, summary] = await Promise.all([api.dashboard(), api.commSummary()]);
      const d  = dash.data    || dash;
      const s  = summary.data || summary;
      renderRevDash(d, s);
    } catch (e) {
      document.getElementById('revDashContent').innerHTML =
        `<div style="color:var(--red);padding:32px;text-align:center">⚠️ ${e.message}</div>`;
    }
  }

  function renderRevDash(d, s) {
    const el = document.getElementById('revDashContent');
    if (!el) return;

    const kpis = [
      { label: 'RECEITA PAGA',    value: fmtBRL(d.revenue?.paid),    color: 'var(--green)', icon: '💰' },
      { label: 'A RECEBER',       value: fmtBRL(d.revenue?.pending), color: 'var(--gold)',  icon: '⏳' },
      { label: 'TOTAL GERADO',    value: fmtBRL(d.revenue?.total),   color: 'var(--q4)',   icon: '📊' },
      { label: 'PARCEIROS ATIVOS',value: fmtNum(d.providers?.active),color: 'var(--neon)', icon: '🤝' },
    ];

    el.innerHTML = `
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
        ${kpis.map(k => `
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);
              letter-spacing:2px;margin-bottom:8px">${k.icon} ${k.label}</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:${k.color}">${k.value}</div>
          </div>`).join('')}
      </div>

      <!-- VERTICAIS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
            color:var(--q4);margin-bottom:16px">⬡ RECEITA POR VERTICAL</div>
          ${(d.verticals||[]).map(v => {
            const vm   = VERTICAL_META[v.vertical] || { icon:'❓', label: v.vertical, color:'var(--text)' };
            const pct  = d.revenue?.total > 0 ? (v.commission / d.revenue.total * 100).toFixed(1) : 0;
            return `
              <div style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                  <span style="font-size:.8rem">${vm.icon} ${vm.label}</span>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:.72rem;color:${vm.color}">
                    ${fmtBRL(v.commission)} <span style="color:var(--muted)">(${v.rate})</span>
                  </span>
                </div>
                <div style="height:4px;background:var(--s3);border-radius:2px">
                  <div style="height:100%;width:${pct}%;background:${vm.color};border-radius:2px;transition:width .6s ease"></div>
                </div>
                <div style="font-size:.67rem;color:var(--muted);margin-top:3px">${v.deals} deals · volume ${fmtBRL(v.volume)}</div>
              </div>`;
          }).join('')}
        </div>

        <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
            color:var(--gold);margin-bottom:16px">🏆 TOP 5 PARCEIROS (30 DIAS)</div>
          ${(d.topProviders||[]).map((p,i) => {
            const vm = VERTICAL_META[p.vertical] || { icon:'❓', color:'var(--text)' };
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:9px 0;
                border-bottom:1px solid var(--border)">
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;
                  color:${i===0?'var(--gold)':i<3?'var(--muted)':'var(--s3)'};width:20px">${i+1}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:.82rem;font-weight:500;white-space:nowrap;
                    overflow:hidden;text-overflow:ellipsis">${p.name || '—'}</div>
                  <div style="font-size:.67rem;color:var(--muted)">${vm.icon} ${p.deals} deals</div>
                </div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:.73rem;color:var(--green)">
                  ${fmtBRL(p.commission)}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- STATUS DE COMISSÕES -->
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
          color:var(--muted);margin-bottom:16px">📋 STATUS DE COMISSÕES</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
          ${(s.byStatus||[]).map(st => {
            const colors = { PENDING:'var(--muted)', CHARGEABLE:'var(--gold)', PAID:'var(--green)', DISPUTED:'var(--red)', REFUNDED:'var(--orange)' };
            const icons  = { PENDING:'⏳', CHARGEABLE:'🔔', PAID:'✅', DISPUTED:'⚠️', REFUNDED:'↩️' };
            const c = colors[st.status] || 'var(--text)';
            return `
              <div style="background:var(--s3);border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center">
                <div style="font-size:1.2rem;margin-bottom:6px">${icons[st.status]||'❓'}</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);
                  margin-bottom:5px">${st.status}</div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:${c}">${fmtBRL(st.totalBRL)}</div>
                <div style="font-size:.67rem;color:var(--muted)">${fmtNum(st.count)} registros</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRO PÚBLICO DE PAGES
  // Integra com o sistema de navegação do index.html existente
  // ═══════════════════════════════════════════════════════════
  const PAGES = {
    'monetizacao':      renderPartnersPage,
    'seguros-sim':      renderInsurancePage,
    'fretes':           renderLogisticsPage,
    'painel-receita':   renderRevenueDashboard,
  };

  function init() {
    // Intercepta o roteador de pages existente
    const origRender = window.renderPage;
    window.renderPage = function(page) {
      if (PAGES[page]) {
        // Atualiza sidebar ativo
        document.querySelectorAll('.sb-item').forEach(el => {
          el.classList.toggle('active', el.dataset.page === page);
        });
        document.querySelectorAll('.nb').forEach(el => {
          el.classList.toggle('active', el.dataset.page === page);
        });
        PAGES[page]();
      } else if (origRender) {
        origRender(page);
      }
    };

    // Expõe utilitários console.log('[MOBYA] 💰 Módulo de Monetização Quântica v1.0 carregado');
  }

  // Auto-init REMOVIDO — init() é chamado pelo App.init() em app.js

  return {
    filterByVertical,
    openQuoteModal,
    closeQuoteModal,
    submitQuote,
    showRegisterPartner,
    onVerticalChange,
    submitRegisterPartner,
    runInsuranceSim,
    runLogisticsSim,
    searchProviders,
    renderPartnersPage,
    renderInsurancePage,
    renderLogisticsPage,
    renderRevenueDashboard,
    renderRevDash,
    init,
  };

})();

// ── PAINEL DO PRESTADOR (injetado via patch) ─────────────────
(function() {
  const _orig = window.Monetization;
  if (!_orig) return;

  const QSMETA = {
    OPEN:      { label:'Aberto',    color:'var(--neon)',  bg:'rgba(0,245,255,.1)',  border:'rgba(0,245,255,.3)',  icon:'📬' },
    ACCEPTED:  { label:'Aceito',    color:'var(--green)', bg:'rgba(16,185,129,.1)', border:'rgba(16,185,129,.3)', icon:'✅' },
    COMPLETED: { label:'Concluído', color:'var(--gold)',  bg:'rgba(251,191,36,.1)', border:'rgba(251,191,36,.3)', icon:'💰' },
    CANCELLED: { label:'Cancelado', color:'var(--muted)', bg:'rgba(100,116,139,.1)',border:'rgba(100,116,139,.3)',icon:'✖️' },
  };
  const CSMETA = {
    PENDING:    { label:'Pendente',  color:'var(--muted)', bg:'rgba(100,116,139,.1)' },
    CHARGEABLE: { label:'A cobrar', color:'var(--gold)',  bg:'rgba(251,191,36,.1)'  },
    PAID:       { label:'Pago',     color:'var(--green)', bg:'rgba(16,185,129,.1)'  },
    DISPUTED:   { label:'Disputado',color:'var(--red)',   bg:'rgba(239,68,68,.1)'   },
    REFUNDED:   { label:'Reembolso',color:'var(--orange)',bg:'rgba(249,115,22,.1)'  },
  };
  const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fmtNum = v => parseInt(v||0).toLocaleString('pt-BR');
  const fmtD   = iso => { if(!iso) return '—'; const d=new Date(iso); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
  const qBadge = s => { const m=QSMETA[s]||{label:s,color:'var(--muted)',bg:'rgba(0,0,0,.2)',border:'rgba(255,255,255,.1)',icon:'•'}; return `<span style="display:inline-flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:.65rem;padding:3px 10px;border-radius:4px;background:${m.bg};color:${m.color};border:1px solid ${m.border}">${m.icon} ${m.label}</span>`; };
  const cBadge = s => { const m=CSMETA[s]||{label:s,color:'var(--muted)',bg:'rgba(0,0,0,.2)'}; return `<span style="font-family:'JetBrains Mono',monospace;font-size:.63rem;padding:2px 8px;border-radius:4px;background:${m.bg};color:${m.color}">${m.label}</span>`; };

  const VMETA = { SERVICE:{icon:'🔧',color:'var(--q3)'}, RENTAL:{icon:'🗝️',color:'var(--neon)'}, LOGISTICS:{icon:'🚛',color:'var(--gold)'}, INSURANCE:{icon:'🛡️',color:'var(--green)'} };

  function qCard(q) {
    const vm = VMETA[q.providerVertical||q.vertical]||{icon:'📋',color:'var(--muted)'};
    const canA = q.status==='OPEN', canC = q.status==='ACCEPTED';
    return `<div id="qcard-${q.id}" style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:10px;transition:border-color .2s" onmouseover="this.style.borderColor='rgba(0,245,255,.25)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.35rem">${vm.icon}</span><span style="font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:2px;color:${vm.color}">${q.providerName||'—'}</span></div>
        ${qBadge(q.status)}
      </div>
      <div style="font-size:.83rem;color:var(--text);line-height:1.5;background:var(--s3);border-radius:8px;padding:10px 12px">${q.description}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="font-size:.72rem;color:var(--muted)"><span style="color:var(--text-dim)">Vertical</span><br><span style="font-family:'JetBrains Mono',monospace">${q.providerVertical||q.vertical||'—'}</span></div>
        <div style="font-size:.72rem;color:var(--muted)"><span style="color:var(--text-dim)">Valor estimado</span><br><span style="font-family:'JetBrains Mono',monospace;color:var(--gold)">${q.estimatedAmount?fmtBRL(q.estimatedAmount):'A combinar'}</span></div>
        <div style="font-size:.72rem;color:var(--muted)"><span style="color:var(--text-dim)">Comissão MOBYA</span><br><span style="font-family:'JetBrains Mono',monospace;color:var(--green)">${q.estimatedCommission?fmtBRL(q.estimatedCommission):'—'}</span></div>
        <div style="font-size:.72rem;color:var(--muted)"><span style="color:var(--text-dim)">Solicitado em</span><br><span style="font-family:'JetBrains Mono',monospace">${fmtD(q.createdAt)}</span></div>
      </div>
      ${q.scheduledAt?`<div style="font-size:.72rem;background:rgba(0,245,255,.07);border:1px solid rgba(0,245,255,.2);border-radius:6px;padding:7px 10px;color:var(--neon);font-family:'JetBrains Mono',monospace">📅 Agendado: ${fmtD(q.scheduledAt)}</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        ${canA?`<button onclick="Monetization.providerAcceptQuote('${q.id}')" style="flex:1;background:linear-gradient(135deg,var(--green),#059669);color:#fff;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">✅ Aceitar Chamado</button><button onclick="Monetization.providerDeclineQuote('${q.id}')" style="flex:1;background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:9px 16px;font-weight:600;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">✖ Recusar</button>`:''}
        ${canC?`<button onclick="Monetization.providerCompleteQuote('${q.id}')" style="flex:1;background:linear-gradient(135deg,var(--gold),#d97706);color:#000;border:none;border-radius:8px;padding:9px 16px;font-weight:700;font-size:.78rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">💰 Marcar como Concluído</button>`:''}
        ${!canA&&!canC?`<div style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;padding:6px 0">Nenhuma ação disponível.</div>`:''}
      </div>
    </div>`;
  }

  function renderTab(tab) {
    const d = window._mpd||{};
    const content = document.getElementById('prov-tab-content');
    if (!content) return;
    ['OPEN','ACCEPTED','COMPLETED','COMMISSIONS'].forEach(t => {
      const b=document.getElementById('ptab-'+t); if(!b) return;
      const a=t===tab; b.style.background=a?'var(--s2)':'transparent'; b.style.color=a?'var(--neon)':'var(--muted)'; b.style.borderBottom=a?'2px solid var(--neon)':'2px solid transparent';
    });
    if (tab==='COMMISSIONS') {
      const list=d.commList||[];
      content.innerHTML = list.length===0?`<div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;text-align:center;padding:48px">Nenhuma comissão registrada ainda.</div>`
        :`<div style="display:flex;flex-direction:column;gap:10px">${list.map(c=>{const cm=CSMETA[c.status]||{label:c.status,color:'var(--muted)'}; return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px"><div><div style="font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted);margin-bottom:4px">${c.vertical||'—'} · ${fmtD(c.createdAt)}</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.25rem;color:${cm.color}">${fmtBRL(c.commissionAmount)}</div></div>${cBadge(c.status)}</div>`;}).join('')}</div>`;
      return;
    }
    const quotes = tab==='OPEN'?(d.open||[]):tab==='ACCEPTED'?(d.accepted||[]):(d.completed||[]);
    if (!quotes.length) { const msgs={OPEN:{icon:'📭',text:'Nenhum chamado aberto.'},ACCEPTED:{icon:'⏸️',text:'Nenhum em andamento.'},COMPLETED:{icon:'📦',text:'Nenhum concluído ainda.'}}; const m=msgs[tab]||{icon:'📋',text:'Nenhum resultado.'}; content.innerHTML=`<div style="text-align:center;padding:48px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">${m.icon}</div><div style="font-family:'JetBrains Mono',monospace;font-size:.78rem">${m.text}</div></div>`; return; }
    content.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">${quotes.map(q=>qCard(q)).join('')}</div>`;
  }

  async function renderProviderDashboard() {
    const main=document.getElementById('main'); if(!main) return;
    main.innerHTML=`<div style="margin-bottom:28px"><div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;background:linear-gradient(135deg,#fff,var(--neon),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent">PAINEL DO PRESTADOR</div><div style="color:var(--muted);font-size:.84rem;margin-top:4px">Gerencie seus chamados · Aceite cotações · Acompanhe comissões</div></div>
    <div id="prov-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:28px">${Array(4).fill(0).map((_,i)=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px;animation:pulse 2s ${i*.15}s infinite"><div style="height:9px;background:var(--s3);border-radius:4px;width:55%;margin-bottom:10px"></div><div style="height:24px;background:var(--s3);border-radius:4px;width:70%"></div></div>`).join('')}</div>
    <div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border)">
      ${['OPEN','ACCEPTED','COMPLETED','COMMISSIONS'].map((t,i)=>`<button id="ptab-${t}" onclick="Monetization.providerSwitchTab('${t}')" style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.78rem;padding:9px 18px;border:none;cursor:pointer;border-radius:8px 8px 0 0;transition:all .15s;background:${i===0?'var(--s2)':'transparent'};color:${i===0?'var(--neon)':'var(--muted)'};border-bottom:${i===0?'2px solid var(--neon)':'2px solid transparent'}">${t==='OPEN'?'📬 Abertos':t==='ACCEPTED'?'✅ Aceitos':t==='COMPLETED'?'💰 Histórico':'📊 Comissões'}</button>`).join('')}
    </div>
    <div id="prov-tab-content"><div style="color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem;text-align:center;padding:40px">⟳ Carregando...</div></div>`;
    try {
      const [qO,qA,qC,cm] = await Promise.all([
        API.monetization.quotesProvider({status:'OPEN',limit:50}),
        API.monetization.quotesProvider({status:'ACCEPTED',limit:50}),
        API.monetization.quotesProvider({status:'COMPLETED',limit:50}),
        API.monetization.commissionsMine({limit:50}),
      ]);
      const open=qO.data||qO.items||[], accepted=qA.data||qA.items||[], completed=qC.data||qC.items||[], commList=cm.data||cm.items||[];
      const pendComm=commList.filter(c=>['PENDING','CHARGEABLE'].includes(c.status)).reduce((s,c)=>s+(c.commissionAmount||0),0);
      const paidComm=commList.filter(c=>c.status==='PAID').reduce((s,c)=>s+(c.commissionAmount||0),0);
      const kpiEl=document.getElementById('prov-kpis');
      if(kpiEl) kpiEl.innerHTML=[
        {label:'CHAMADOS ABERTOS',value:fmtNum(open.length),color:'var(--neon)',icon:'📬'},
        {label:'EM ANDAMENTO',value:fmtNum(accepted.length),color:'var(--q3)',icon:'⚙️'},
        {label:'A RECEBER',value:fmtBRL(pendComm),color:'var(--gold)',icon:'⏳'},
        {label:'COMISSÃO PAGA',value:fmtBRL(paidComm),color:'var(--green)',icon:'💰'},
      ].map(k=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px"><div style="font-size:1.3rem;margin-bottom:8px">${k.icon}</div><div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);letter-spacing:1px;margin-bottom:6px">${k.label}</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:${k.color}">${k.value}</div></div>`).join('');
      window._mpd={open,accepted,completed,commList};
      renderTab('OPEN');
    } catch(e) {
      const c=document.getElementById('prov-tab-content');
      if(c) c.innerHTML=`<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:24px;text-align:center"><div style="font-size:1.5rem;margin-bottom:8px">⚠️</div><div style="color:var(--red);font-family:'JetBrains Mono',monospace;font-size:.8rem">${e.message}</div></div>`;
    }
  }

  async function providerSwitchTab(tab) { renderTab(tab); }

  async function providerAcceptQuote(id) {
    const btn=document.querySelector('#qcard-'+id+' button'); if(btn){btn.disabled=true;btn.textContent='⟳ Processando...';}
    try {
      await API.monetization.acceptQuote(id);
      const d=window._mpd; if(d){const i=d.open.findIndex(q=>q.id===id);if(i!==-1){const q={...d.open[i],status:'ACCEPTED'};d.open.splice(i,1);d.accepted.unshift(q);}}
      const card=document.getElementById('qcard-'+id); if(card) card.style.opacity='0.5';
      setTimeout(()=>renderTab('OPEN'),300);
    } catch(e){alert('Erro ao aceitar: '+e.message);if(btn){btn.disabled=false;btn.textContent='✅ Aceitar Chamado';}}
  }

  async function providerDeclineQuote(id) {
    if(!confirm('Recusar este chamado?')) return;
    const d=window._mpd; if(d){const i=d.open.findIndex(q=>q.id===id);if(i!==-1) d.open.splice(i,1);}
    renderTab('OPEN');
  }

  async function providerCompleteQuote(id) {
    const vs=prompt('Valor final do serviço (R$):\nDeixe em branco para usar o estimado:'); if(vs===null) return;
    const btn=document.querySelector('#qcard-'+id+' button'); if(btn){btn.disabled=true;btn.textContent='⟳ Processando...';}
    try {
      const body=vs.trim()?{finalAmount:parseFloat(vs.replace(',','.'))}:{};
      await API.monetization.completeQuote(id,body);
      const d=window._mpd; if(d){const i=d.accepted.findIndex(q=>q.id===id);if(i!==-1){const q={...d.accepted[i],status:'COMPLETED'};d.accepted.splice(i,1);d.completed.unshift(q);}}
      const card=document.getElementById('qcard-'+id); if(card) card.style.opacity='0.5';
      setTimeout(()=>renderTab('ACCEPTED'),300);
    } catch(e){alert('Erro ao concluir: '+e.message);if(btn){btn.disabled=false;btn.textContent='💰 Marcar como Concluído';}}
  }

  // Injeta no objeto Monetization existente
  Object.assign(window.Monetization, {
    renderProviderDashboard,
    providerSwitchTab,
    providerAcceptQuote,
    providerDeclineQuote,
    providerCompleteQuote,
  });

  // Registra a page no roteador
  const origRender=window.renderPage;
  window.renderPage=function(page){
    if(page==='painel-prestador'){
      document.querySelectorAll('.sb-item').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
      renderProviderDashboard();
    } else if(origRender){ origRender(page); }
  };
})();
