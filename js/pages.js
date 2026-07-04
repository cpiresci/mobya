// ============================================================
// MOBYA — pages.js  (Quantum Engine v3.0)
// Renderizador de todas as páginas da plataforma.
// Depende de: api.js, auth.js, chat.js, calc.js, monetization.js
// ============================================================

window.Pages = (() => {

  // ── helpers ────────────────────────────────────────────────
  const fmtBRL = v =>
    `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fmtNum  = v => parseInt(v||0).toLocaleString('pt-BR');
  const ago     = iso => {
    const s = Math.round((Date.now()-new Date(iso))/1000);
    if (s<60)   return `${s}s atrás`;
    if (s<3600) return `${Math.round(s/60)}min atrás`;
    if (s<86400)return `${Math.round(s/3600)}h atrás`;
    return `${Math.round(s/86400)}d atrás`;
  };
  const escHtml = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // images vem do backend como array já parseado (campo Prisma Json), mas dados antigos
  // podem ter ficado salvos como string JSON — trata os dois casos.
  const parseImages = images => {
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') { try { return JSON.parse(images||'[]'); } catch { return []; } }
    return [];
  };
  const main    = () => document.getElementById('main');

  function pageHeader(title, subtitle, gradient='var(--q3),var(--neon)') {
    return `<div style="margin-bottom:28px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;
        background:linear-gradient(135deg,#fff,${gradient});
        -webkit-background-clip:text;-webkit-text-fill-color:transparent">${title}</div>
      ${subtitle?`<div style="color:var(--muted);font-size:.84rem;margin-top:4px">${subtitle}</div>`:''}
    </div>`;
  }

  function card(content, opts={}) {
    const { border='var(--border)', radius='12px', pad='20px', extra='' } = opts;
    return `<div style="background:var(--s2);border:1px solid ${border};border-radius:${radius};padding:${pad};${extra}">${content}</div>`;
  }

  function badge(label, color='var(--q4)', bg='rgba(124,58,237,.15)', border='rgba(124,58,237,.25)') {
    return `<span style="font-family:'JetBrains Mono',monospace;font-size:.6rem;padding:2px 8px;
      border-radius:4px;background:${bg};color:${color};border:1px solid ${border}">${label}</span>`;
  }

  function skeleton(rows=3) {
    return Array(rows).fill(0).map((_,i)=>`
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
        padding:18px;animation:pulse 2s infinite;animation-delay:${i*.12}s">
        <div style="height:10px;background:var(--s3);border-radius:4px;margin-bottom:10px;width:${40+i*15}%"></div>
        <div style="height:22px;background:var(--s3);border-radius:4px;width:${60+i*10}%"></div>
      </div>`).join('');
  }


  // ═══════════════════════════════════════════════════════════
  // HOME — Painel Quântico (v5.0 rewrite)
  // ═══════════════════════════════════════════════════════════
  async function renderHome() {
    const el = main();
    if (!el) return;
    el.innerHTML = `
      <div class="qhome-wrap">

        <div class="qhome-header">
          <div class="qhome-badge"><div class="q-dot"></div><span>⬡ NEXUS QUANTUM ENGINE v3.0 · 9 AGENTES ATIVOS</span></div>
          <h1 class="qhome-title">CONSULTE A IA<br><em>AUTOMOTIVA</em></h1>
          <p class="qhome-sub">Motor multi-agente com fallback quântico — compra, venda, seguro, manutenção e emergência em um único prompt.</p>
        </div>

        <div class="qchat-mega" id="homeChatMega">
          <div class="qcm-head">
            <div class="qcm-orb" id="qcmOrb">⬡</div>
            <div class="qcm-info">
              <div class="qcm-name" id="qcmName">NEXUS-CORE</div>
              <div class="qcm-desc" id="qcmDesc">Orquestrador · 9 agentes especializados</div>
            </div>
            <div class="qcm-status"><div class="q-dot"></div>ONLINE</div>
            <div class="qcm-provider" id="qcmProvider">–</div>
          </div>

          <div class="qcm-chips" id="qcmChips"></div>
          <div class="qcm-examples" id="qcmExamples"></div>
          <div class="qcm-msgs"    id="qcmMsgs"></div>

          <div class="qcm-input-wrap">
            <div class="qcm-input-box">
              <textarea class="qcm-textarea" id="qcmTextarea" rows="3"
                placeholder="Pergunte qualquer coisa sobre veículos..."
                onkeydown="HomeChat.key(event)"
                oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,200)+'px'"
              ></textarea>
              <div class="qcm-input-footer">
                <div class="qcm-input-hint">
                  <span>Enter para enviar</span>
                  <span>Shift+Enter nova linha</span>
                </div>
                <button class="qcm-send" id="qcmSend" onclick="HomeChat.send()">
                  <span class="qcm-send-ico">➤</span>
                  <span class="qcm-send-txt">CONSULTAR IA</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="qhome-quick">
          ${[
            {page:'classificados',icon:'🚘',label:'Classificados',color:'var(--q4)',bg:'rgba(124,58,237,.1)'},
            {page:'agentes',icon:'🤖',label:'Agentes IA',color:'var(--neon)',bg:'rgba(0,245,255,.07)'},
            {page:'emergencia',icon:'🚨',label:'SOS 24H',color:'var(--red)',bg:'rgba(244,63,94,.1)'},
            {page:'calculadoras',icon:'🧮',label:'Calculadoras',color:'var(--gold)',bg:'rgba(251,191,36,.08)'},
            {page:'seguros-sim',icon:'🛡️',label:'Seguros IA',color:'var(--green)',bg:'rgba(16,185,129,.08)'},
            {page:'vistoria',icon:'🔍',label:'Vistoria',color:'var(--q4)',bg:'rgba(124,58,237,.1)'},
            {page:'fretes',icon:'🚛',label:'Fretes',color:'var(--gold)',bg:'rgba(251,191,36,.08)'},
            {page:'monetizacao',icon:'💰',label:'Parceiros',color:'var(--green)',bg:'rgba(16,185,129,.08)'},
          ].map(q=>`<div onclick="App.navigate('${q.page}')" class="qhome-qcard"
              style="background:${q.bg};border:1px solid rgba(255,255,255,.06)"
              onmouseover="this.style.borderColor='rgba(255,255,255,.2)';this.style.transform='translateY(-4px)'"
              onmouseout="this.style.borderColor='rgba(255,255,255,.06)';this.style.transform='translateY(0)'">
              <div class="qhome-qico">${q.icon}</div>
              <div style="font-size:.76rem;font-weight:600;color:${q.color}">${q.label}</div>
            </div>`).join('')}
        </div>

        <div class="qhome-bottom">
          <div class="qhome-listings-col">
            <div class="qhome-sec-hd">
              <span class="qhome-sec-tag">⬡ MELHORES OFERTAS</span>
              <button onclick="App.navigate('classificados')" class="qhome-sec-link">Ver todos →</button>
            </div>
            <div id="homeListings" style="display:grid;gap:10px">${skeleton(3)}</div>
          </div>
          <div class="qhome-side-col">
            ${card(`<div style="font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:2px;color:var(--q4);margin-bottom:14px">⬡ STATUS NEXUS</div>
              <div id="homProviders" style="display:flex;flex-direction:column;gap:8px">
                ${['SambaNova','Cerebras','Gemini','OpenRouter'].map(p=>`
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:.78rem;color:var(--muted)">${p}</span>
                    <span id="hp_${p.toLowerCase()}" style="font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--muted)">● –</span>
                  </div>`).join('')}
              </div>`)}
            ${card(`<div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;color:var(--green);margin-bottom:10px">💰 GANHE COM MOBYA</div>
              <div style="font-size:.82rem;color:var(--text);margin-bottom:12px;line-height:1.5">Integre sua oficina, locadora ou seguradora e receba leads qualificados.</div>
              <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
                ${[['🔧 Serviços','18%'],['🗝️ Locação','5%'],['🚛 Fretes','15%'],['🛡️ Seguros','12%']].map(([l,r])=>`
                  <div style="display:flex;justify-content:space-between;font-size:.76rem">
                    <span style="color:var(--muted)">${l}</span>
                    <span style="color:var(--green);font-family:'JetBrains Mono',monospace">${r}</span>
                  </div>`).join('')}
              </div>
              <button onclick="Monetization.showRegisterPartner()" style="width:100%;background:rgba(16,185,129,.12);color:var(--green);border:1px solid rgba(16,185,129,.25);padding:9px;border-radius:8px;font-weight:600;font-size:.8rem;cursor:pointer">Cadastrar meu negócio →</button>
            `,{border:'rgba(16,185,129,.2)'})}
          </div>
        </div>

        <div class="qhome-footer">
          <div class="qhf-item"><span class="qhf-ico">⬡</span><span>9 Agentes NEXUS especializados</span></div>
          <div class="qhf-sep">·</div>
          <div class="qhf-item"><span class="qhf-ico neon">●</span><span>SambaNova · Cerebras · Gemini · OpenRouter</span></div>
          <div class="qhf-sep">·</div>
          <div class="qhf-item"><span>🔒</span><span>Consultas criptografadas</span></div>
        </div>

      </div>`;

    // inicializa chat (flag impede re-init ao voltar)
    HomeChat.init();

    // dados em paralelo
    Promise.all([
      API.listings.search({limit:6,sort:'recent'}).catch(()=>null),
      API.ai.providers().catch(()=>null),
    ]).then(([listR, provR]) => {
      const listings = listR?.data || [];
      const homeEl   = document.getElementById('homeListings');
      if (homeEl) {
        homeEl.innerHTML = listings.length
          ? listings.map(l => listingMiniCard(l)).join('')
          : '<div style="color:var(--muted);font-size:.8rem;padding:24px;text-align:center">Nenhum anúncio disponível.</div>';
      }
      const providers = provR?.data || [];
      providers.forEach(p => {
        const el = document.getElementById(`hp_${p.name.toLowerCase()}`);
        if (el) {
          el.style.color   = p.configured ? 'var(--green)' : 'var(--muted)';
          el.textContent   = p.configured ? '● ATIVO' : '● OFF';
        }
      });
    });
  }

  function listingMiniCard(l) {
    const imgs = parseImages(l.images);
    const STATUS_BADGE = {
      PENDING_REVIEW: { label:'⏳ Em análise', bg:'rgba(245,158,11,.15)', color:'#f59e0b' },
      ACTIVE:         { label:'✅ Ativo',       bg:'rgba(16,185,129,.15)', color:'#10b981' },
      REJECTED:       { label:'❌ Rejeitado',   bg:'rgba(239,68,68,.15)',  color:'#ef4444' },
      PAUSED:         { label:'⏸️ Pausado',     bg:'rgba(148,163,184,.15)',color:'#94a3b8' },
    };
    const badge = STATUS_BADGE[l.status];
    return `
      <div onclick="App.navigate('listing','${l.id}')" style="
        background:var(--s2);border:1px solid var(--border);border-radius:10px;
        padding:14px;display:flex;gap:12px;cursor:pointer;transition:all .15s"
        onmouseover="this.style.borderColor='var(--border2)'"
        onmouseout="this.style.borderColor='var(--border)'">
        <div style="width:72px;height:54px;border-radius:7px;overflow:hidden;flex-shrink:0;
          background:var(--s3);display:flex;align-items:center;justify-content:center;position:relative">
          ${imgs[0]
            ? `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`
            : `<span style="font-size:1.6rem">🚗</span>`}
          ${imgs.length>1?`<span style="position:absolute;bottom:2px;right:2px;font-family:'JetBrains Mono',monospace;
            font-size:.5rem;padding:1px 4px;border-radius:3px;background:rgba(0,0,0,.75);color:#fff">📷${imgs.length}</span>`:''}
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
            <div style="font-weight:600;font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(l.title)}</div>
            ${badge?`<span style="flex-shrink:0;font-size:.6rem;padding:2px 6px;border-radius:4px;background:${badge.bg};color:${badge.color};white-space:nowrap">${badge.label}</span>`:''}
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--q4);margin:2px 0">${fmtBRL(l.price)}</div>
          <div style="font-size:.7rem;color:var(--muted)">${l.city}/${l.state} · ${ago(l.createdAt)}</div>
        </div>
      </div>`;
  }

  // Card usado no dashboard ("MEUS ANÚNCIOS") — como listingMiniCard, mas com ações rápidas do dono.
  function ownerMiniCard(l) {
    const imgs = parseImages(l.images);
    const STATUS_BADGE = {
      PENDING_REVIEW: { label:'⏳ Em análise', bg:'rgba(245,158,11,.15)', color:'#f59e0b' },
      ACTIVE:         { label:'✅ Ativo',       bg:'rgba(16,185,129,.15)', color:'#10b981' },
      REJECTED:       { label:'❌ Rejeitado',   bg:'rgba(239,68,68,.15)',  color:'#ef4444' },
      PAUSED:         { label:'⏸️ Pausado',     bg:'rgba(148,163,184,.15)',color:'#94a3b8' },
    };
    const badge = STATUS_BADGE[l.status];
    return `
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
        padding:14px;margin-bottom:10px">
        <div onclick="App.navigate('listing','${l.id}')" style="display:flex;gap:12px;cursor:pointer">
          <div style="width:72px;height:54px;border-radius:7px;overflow:hidden;flex-shrink:0;
            background:var(--s3);display:flex;align-items:center;justify-content:center;position:relative">
            ${imgs[0]
              ? `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`
              : `<span style="font-size:1.6rem">🚗</span>`}
            ${imgs.length>1?`<span style="position:absolute;bottom:2px;right:2px;font-family:'JetBrains Mono',monospace;
              font-size:.5rem;padding:1px 4px;border-radius:3px;background:rgba(0,0,0,.75);color:#fff">📷${imgs.length}</span>`:''}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
              <div style="font-weight:600;font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(l.title)}</div>
              ${badge?`<span style="flex-shrink:0;font-size:.6rem;padding:2px 6px;border-radius:4px;background:${badge.bg};color:${badge.color};white-space:nowrap">${badge.label}</span>`:''}
            </div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--q4);margin:2px 0">${fmtBRL(l.price)}</div>
            <div style="font-size:.7rem;color:var(--muted)">${l.city}/${l.state} · ${ago(l.createdAt)}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button onclick="event.stopPropagation();Pages.editListing('${l.id}')" style="
            flex:1;background:rgba(124,58,237,.1);color:var(--q4);border:1px solid rgba(124,58,237,.22);
            padding:7px;border-radius:6px;font-size:.7rem;font-weight:600;cursor:pointer">✏️ Editar</button>
          ${l.status==='ACTIVE'?`
            <button onclick="event.stopPropagation();Pages.pauseListing('${l.id}',()=>Pages.renderDashboard())" style="
              flex:1;background:rgba(148,163,184,.08);color:#cbd5e1;border:1px solid rgba(148,163,184,.2);
              padding:7px;border-radius:6px;font-size:.7rem;font-weight:600;cursor:pointer">⏸️ Pausar</button>`:''}
          ${l.status==='PAUSED'?`
            <button onclick="event.stopPropagation();Pages.reactivateListing('${l.id}',()=>Pages.renderDashboard())" style="
              flex:1;background:rgba(16,185,129,.1);color:var(--green);border:1px solid rgba(16,185,129,.22);
              padding:7px;border-radius:6px;font-size:.7rem;font-weight:600;cursor:pointer">▶️ Reativar</button>`:''}
          <button onclick="event.stopPropagation();Pages.deleteListing('${l.id}',()=>Pages.renderDashboard())" style="
            flex:1;background:rgba(239,68,68,.06);color:var(--red2);border:1px solid rgba(239,68,68,.18);
            padding:7px;border-radius:6px;font-size:.7rem;font-weight:600;cursor:pointer">🗑️ Excluir</button>
        </div>
      </div>`;
  }


  // ═══════════════════════════════════════════════════════════
  // CLASSIFICADOS
  // ═══════════════════════════════════════════════════════════
  async function renderClassificados() {
    const el = main();
    if (!el) return;

    el.innerHTML = `
      ${pageHeader('CLASSIFICADOS','Compra · Venda · Peças · Serviços · Seguros')}

      <!-- FILTROS -->
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;
        padding:20px;margin-bottom:24px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
          <div style="flex:2;min-width:200px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">BUSCA</label>
            <input id="clQuery" placeholder="Marca, modelo, título..." onkeydown="if(event.key==='Enter')Pages.searchListings()" style="
              width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>
          <div style="flex:1;min-width:120px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">TIPO</label>
            <select id="clType" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              <option value="">Todos</option>
              <option value="SALE">🚗 Venda</option>
              <option value="RENT">🗝️ Aluguel</option>
              <option value="PART">⚙️ Peça</option>
              <option value="SERVICE">🔧 Serviço</option>
              <option value="INSURANCE">🛡️ Seguro</option>
              <option value="FINANCING">💰 Financiamento</option>
            </select>
          </div>
          <div style="flex:1;min-width:120px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">CIDADE</label>
            <input id="clCity" placeholder="São Paulo" style="
              width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>
          <div style="flex:1;min-width:110px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">ORDENAR</label>
            <select id="clSort" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="views">Mais vistos</option>
            </select>
          </div>
          <button onclick="Pages.searchListings()" style="
            background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
            padding:9px 22px;border-radius:8px;font-weight:600;font-size:.82rem;
            border:none;cursor:pointer;white-space:nowrap;box-shadow:0 0 14px rgba(124,58,237,.3)">
            Buscar
          </button>
          <button onclick="Pages.showCreateListing()" style="
            background:rgba(16,185,129,.1);color:var(--green);border:1px solid rgba(16,185,129,.25);
            padding:9px 16px;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap">
            + Anunciar
          </button>
        </div>
      </div>

      <div id="clResults" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${skeleton(6)}
      </div>
      <div id="clPager" style="display:flex;justify-content:center;gap:8px;margin-top:24px"></div>
    `;

    // Aplica query vinda da busca da home (home-premium.js)
    if (window.__mobyaSearchQuery) {
      const inp = document.getElementById('clQuery');
      if (inp) inp.value = window.__mobyaSearchQuery;
      window.__mobyaSearchQuery = null;
    }
    Pages.searchListings && Pages.searchListings();
  }

  let clPage = 1;

  searchListings = async function(page=1) {
    clPage = page;
    const results = document.getElementById('clResults');
    if (!results) return;
    results.innerHTML = skeleton(6);

    const params = {
      page, limit: 12,
      query: document.getElementById('clQuery')?.value?.trim()  || undefined,
      type:  document.getElementById('clType')?.value           || undefined,
      city:  document.getElementById('clCity')?.value?.trim()   || undefined,
      sort:  document.getElementById('clSort')?.value           || 'recent',
    };
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    try {
      const r = await API.listings.search(params);
      const listings  = r.data || [];
      const pagination= r.pagination || {};

      if (!listings.length) {
        results.innerHTML = `<div style="color:var(--muted);padding:48px;text-align:center;grid-column:1/-1;
          font-size:.84rem">Nenhum anúncio encontrado com esses filtros.</div>`;
        return;
      }

      results.innerHTML = listings.map(l => listingCard(l)).join('');

      // Paginação
      const pager = document.getElementById('clPager');
      if (pager && pagination.totalPages > 1) {
        const pages = Array.from({ length: Math.min(pagination.totalPages,7) }, (_,i) => i+1);
        pager.innerHTML = pages.map(p => `
          <button onclick="Pages.searchListings(${p})" style="
            padding:7px 13px;border-radius:6px;font-size:.8rem;cursor:pointer;
            background:${p===clPage?'var(--q2)':'var(--s3)'};
            color:${p===clPage?'#fff':'var(--muted)'};
            border:1px solid ${p===clPage?'var(--q3)':'var(--border)'}">
            ${p}
          </button>`).join('');
      }
    } catch (e) {
      results.innerHTML = `<div style="color:var(--red);padding:32px;text-align:center;grid-column:1/-1">
        ⚠️ ${e.message}</div>`;
    }
  };

  function listingCard(l) {
    const imgs = parseImages(l.images);
    const typeColors = { SALE:'var(--q4)', RENT:'var(--neon)', PART:'var(--gold)',
                         SERVICE:'var(--green)', INSURANCE:'var(--green)', FINANCING:'var(--orange)' };
    const typeLabels = { SALE:'Venda', RENT:'Aluguel', PART:'Peça', SERVICE:'Serviço',
                         INSURANCE:'Seguro', FINANCING:'Financiamento' };
    return `
      <div onclick="App.navigate('listing','${l.id}')" style="
        background:var(--s2);border:1px solid var(--border);border-radius:12px;
        overflow:hidden;cursor:pointer;transition:all .18s"
        onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='var(--border2)'"
        onmouseout="this.style.transform='translateY(0)';this.style.borderColor='var(--border)'">
        <div style="height:160px;background:var(--s3);position:relative;overflow:hidden">
          ${imgs[0]
            ? `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover">`
            : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem">🚗</div>`}
          <span style="position:absolute;top:10px;left:10px;font-family:'JetBrains Mono',monospace;
            font-size:.58rem;padding:3px 8px;border-radius:4px;background:rgba(0,0,0,.7);
            color:${typeColors[l.type]||'var(--text)'};border:1px solid rgba(255,255,255,.1)">
            ${typeLabels[l.type]||l.type}
          </span>
          ${l.aiQualityScore >= 80 ? `<span style="position:absolute;top:10px;right:10px;
            font-family:'JetBrains Mono',monospace;font-size:.55rem;padding:3px 7px;border-radius:4px;
            background:rgba(16,185,129,.2);color:var(--green);border:1px solid rgba(16,185,129,.3)">
            ⬡ IA ${l.aiQualityScore}</span>` : ''}
          ${window.ListingGallery ? ListingGallery.cardDots(imgs) : ''}
          ${window.ListingGallery ? ListingGallery.cardBadge(imgs) : ''}
        </div>
        <div style="padding:14px">
          <div style="font-weight:600;font-size:.88rem;margin-bottom:4px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(l.title)}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.35rem;color:var(--q4);margin-bottom:6px">
            ${fmtBRL(l.price)}
            ${l.priceNegotiable?`<span style="font-size:.65rem;color:var(--muted);font-family:'Space Grotesk',sans-serif"> · negociável</span>`:''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:.73rem;color:var(--muted)">${escHtml(l.city)}/${l.state}</span>
            <span style="font-size:.68rem;color:var(--muted)">${ago(l.createdAt)} · ${fmtNum(l.views)} views</span>
          </div>
        </div>
      </div>`;
  }


  const CLOUDINARY_CLOUD = 'dnvmunvag';
  const CLOUDINARY_PRESET = 'mobya_unsigned';

  function _uploadToCloudinary(blob) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', blob);
      fd.append('upload_preset', CLOUDINARY_PRESET);
      fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:'POST', body:fd })
        .then(r => r.json())
        .then(data => {
          if (data.secure_url) resolve(data.secure_url);
          else reject(new Error(data.error?.message || 'Falha no upload Cloudinary.'));
        })
        .catch(() => reject(new Error('Falha de rede no upload da foto.')));
    });
  }

  function _compressPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Nenhuma foto.'));
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1280; let w = img.width, h = img.height;
          if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h*MAX/w); w=MAX; } else { w=Math.round(w*MAX/h); h=MAX; } }
          const cv = document.createElement('canvas'); cv.width=w; cv.height=h;
          cv.getContext('2d').drawImage(img,0,0,w,h);
          cv.toBlob(blob => {
            if (!blob) return reject(new Error('Falha ao gerar imagem.'));
            _uploadToCloudinary(blob).then(resolve).catch(reject);
          }, 'image/jpeg', 0.82);
        };
        img.onerror = () => reject(new Error('Falha ao processar foto.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Falha ao ler foto.'));
      reader.readAsDataURL(file);
    });
  }
  const LISTING_MAX_PHOTOS = 10;

  function _pickListingPhoto(limit) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type='file'; input.accept='image/*'; input.multiple=true;
      input.onchange = async () => {
        const files = Array.from(input.files||[]).slice(0, Math.max(0, limit));
        if (!files.length) return resolve([]);
        try { resolve(await Promise.all(files.map(_compressPhoto))); } catch(e) { resolve([]); }
      };
      input.click();
    });
  }
  submitListing = async function() {
    const btn   = document.getElementById('clSubmitBtn');
    const title = document.getElementById('clTitle')?.value?.trim();
    const price = document.getElementById('clPrice')?.value;
    const city  = document.getElementById('clCityNew')?.value?.trim();
    const state = (document.getElementById('clState')?.value?.trim().toUpperCase()||'').slice(0,2);
    const desc  = document.getElementById('clDesc')?.value?.trim();
    const type  = document.getElementById('clTypeNew')?.value || 'SALE';
    const editId = window._editingListingId || null;

    if (!title||!price||!city||!state||!desc) {
      App.toast('Preencha todos os campos obrigatórios.','warn'); return;
    }
    const nFotos = (window._listingPhotos||[]).length;
    if (btn) {
      btn.disabled=true; btn.style.opacity='.6';
      btn.textContent = nFotos > 0 ? `⟳ ENVIANDO ${nFotos} FOTO(S)…` : (editId ? '⟳ SALVANDO…' : '⟳ PUBLICANDO…');
    }
    try {
      const _imgs = window._listingPhotos || [];
      const payload = { title, price:parseFloat(price), city, state, description:desc, type, images: _imgs };
      if (editId) {
        await API.listings.update(editId, payload);
        window._listingPhotos = []; window._editingListingId = null;
        document.getElementById('createModal')?.remove();
        App.toast('✅ Anúncio atualizado com sucesso!','ok');
        Pages.renderListing(editId);
      } else {
        await API.listings.create(payload);
        window._listingPhotos = [];
        document.getElementById('createModal')?.remove();
        App.toast('✅ Anúncio publicado com sucesso!','ok');
        Pages.searchListings && Pages.searchListings();
      }
    } catch(e) {
      App.toast(e.message||'Erro ao salvar.','err');
    } finally {
      if (btn) { btn.disabled=false; btn.style.opacity='1'; btn.textContent = editId ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR ANÚNCIO'; }
    }
  };


  // ═══════════════════════════════════════════════════════════
  // DETALHE DO ANÚNCIO
  // ═══════════════════════════════════════════════════════════
  const OWNER_STATUS_INFO = {
    PENDING_REVIEW: { label:'⏳ Em análise',   color:'#f59e0b', bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.25)', desc:'Nossa equipe está revisando este anúncio antes de publicá-lo.' },
    ACTIVE:         { label:'✅ Ativo',         color:'#10b981', bg:'rgba(16,185,129,.1)',  border:'rgba(16,185,129,.25)', desc:'Visível na busca pública.' },
    PAUSED:         { label:'⏸️ Pausado',       color:'#94a3b8', bg:'rgba(148,163,184,.1)', border:'rgba(148,163,184,.25)', desc:'Fora da busca pública até você reativar.' },
    REJECTED:       { label:'❌ Rejeitado',     color:'#ef4444', bg:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.25)',  desc:'Não atendeu às regras da plataforma.' },
    REMOVED:        { label:'🗑️ Removido',      color:'#6b6b90', bg:'rgba(107,107,144,.1)', border:'rgba(107,107,144,.25)',desc:'Este anúncio foi excluído.' },
  };

  function ownerPanel(l) {
    const st = OWNER_STATUS_INFO[l.status] || { label:l.status, color:'var(--muted)', bg:'var(--s3)', border:'var(--border)', desc:'' };
    return `
      <div style="background:var(--s2);border:1px solid ${st.border};border-radius:12px;padding:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--q4);letter-spacing:2px">⬡ PAINEL DO ANUNCIANTE</div>
          <span style="font-size:.66rem;padding:3px 9px;border-radius:5px;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${st.label}</span>
        </div>
        ${st.desc?`<div style="font-size:.72rem;color:var(--muted);margin-bottom:14px">${st.desc}${l.status==='REJECTED'&&l.rejectionReason?`<br><span style="color:${st.color}">Motivo: ${escHtml(l.rejectionReason)}</span>`:''}</div>`:''}
        <div style="display:flex;flex-direction:column;gap:8px">
          <button onclick="Pages.editListing('${l.id}')" style="
            width:100%;background:rgba(124,58,237,.12);color:var(--q4);border:1px solid rgba(124,58,237,.25);
            padding:10px;border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer">
            ✏️ Editar anúncio
          </button>
          ${l.status==='ACTIVE'?`
            <button onclick="Pages.pauseListing('${l.id}')" id="ownerPauseBtn" style="
              width:100%;background:rgba(148,163,184,.1);color:#cbd5e1;border:1px solid rgba(148,163,184,.25);
              padding:10px;border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer">
              ⏸️ Pausar anúncio
            </button>`:''}
          ${l.status==='PAUSED'?`
            <button onclick="Pages.reactivateListing('${l.id}')" id="ownerReactivateBtn" style="
              width:100%;background:rgba(16,185,129,.12);color:var(--green);border:1px solid rgba(16,185,129,.25);
              padding:10px;border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer">
              ▶️ Reativar anúncio
            </button>`:''}
          <button onclick="Pages.deleteListing('${l.id}')" id="ownerDeleteBtn" style="
            width:100%;background:rgba(239,68,68,.08);color:var(--red2);border:1px solid rgba(239,68,68,.2);
            padding:10px;border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer">
            🗑️ Excluir anúncio
          </button>
        </div>
      </div>`;
  }

  editListing = async function(id) {
    try {
      const r = await API.listings.get(id);
      showCreateListing(r.data.type, r.data);
    } catch(e) { App.toast(e.message||'Erro ao carregar anúncio.','err'); }
  };

  pauseListing = async function(id, onDone) {
    const btn = document.getElementById('ownerPauseBtn');
    if (btn) { btn.disabled=true; btn.textContent='⟳ Pausando…'; }
    try {
      await API.listings.pause(id);
      App.toast('⏸️ Anúncio pausado.','ok');
      (onDone || (() => Pages.renderListing(id)))();
    } catch(e) {
      App.toast(e.message||'Erro ao pausar.','err');
      if (btn) { btn.disabled=false; btn.textContent='⏸️ Pausar anúncio'; }
    }
  };

  reactivateListing = async function(id, onDone) {
    const btn = document.getElementById('ownerReactivateBtn');
    if (btn) { btn.disabled=true; btn.textContent='⟳ Reativando…'; }
    try {
      await API.listings.reactivate(id);
      App.toast('▶️ Anúncio reativado.','ok');
      (onDone || (() => Pages.renderListing(id)))();
    } catch(e) {
      App.toast(e.message||'Erro ao reativar.','err');
      if (btn) { btn.disabled=false; btn.textContent='▶️ Reativar anúncio'; }
    }
  };

  deleteListing = async function(id, onDone) {
    if (!confirm('Excluir este anúncio definitivamente? Esta ação não pode ser desfeita.')) return;
    const btn = document.getElementById('ownerDeleteBtn');
    if (btn) { btn.disabled=true; btn.textContent='⟳ Excluindo…'; }
    try {
      await API.listings.remove(id);
      App.toast('🗑️ Anúncio excluído.','ok');
      (onDone || (() => App.navigate('dashboard')))();
    } catch(e) {
      App.toast(e.message||'Erro ao excluir.','err');
      if (btn) { btn.disabled=false; btn.textContent='🗑️ Excluir anúncio'; }
    }
  };

  async function renderListing(id) {
    const el = main();
    if (!el) return;
    el.innerHTML = `<button onclick="App.navigate('classificados')" style="
      background:none;border:none;color:var(--muted);cursor:pointer;font-size:.82rem;margin-bottom:20px">
      ← Voltar aos classificados</button>${skeleton(2)}`;

    try {
      const r = await API.listings.get(id);
      const l = r.data;
      const imgs = parseImages(l.images);
      const isOwner = window.MobyaAuth?.getUser?.()?.id === l.userId;

      let rentalConfig = null;
      if (l.type === 'RENT') {
        try { const rc = await API.rental.getConfigByListing(l.id); rentalConfig = rc?.data || null; } catch {}
      }
      
      el.innerHTML = `
        <button onclick="App.navigate('classificados')" style="
          background:none;border:none;color:var(--muted);cursor:pointer;font-size:.82rem;margin-bottom:20px">
          ← Voltar aos classificados</button>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:24px;align-items:start">
          <div>
            <!-- Imagens — Galeria Quântica Premium -->
            ${window.ListingGallery ? ListingGallery.render(imgs, l.id) : `
              <div style="border-radius:12px;overflow:hidden;background:var(--s3);
                height:320px;margin-bottom:16px;display:flex;align-items:center;justify-content:center">
                ${imgs[0]?`<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover">`
                         :`<span style="font-size:4rem">🚗</span>`}
              </div>`}
            <!-- Título + preço -->
            <h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:2px;margin-bottom:8px">
              ${escHtml(l.title)}</h2>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:2.4rem;color:var(--q4);margin-bottom:16px">
              ${fmtBRL(l.price)}</div>
            <!-- Descrição -->
            <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
              padding:18px;font-size:.85rem;line-height:1.7;color:var(--muted);margin-bottom:16px">
              ${escHtml(l.description||'')}</div>
            <!-- Veículo info -->
            ${l.vehicle?`
              <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px">
                <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
                  color:var(--q4);margin-bottom:12px">⬡ DADOS DO VEÍCULO</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
                  ${[
                    ['Marca',l.vehicle.brand],['Modelo',l.vehicle.model],['Ano',l.vehicle.year],
                    ['KM',fmtNum(l.vehicle.mileage)],
                  ].map(([k,v])=>`<div><div style="font-size:.68rem;color:var(--muted)">${k}</div>
                    <div style="font-weight:600;font-size:.88rem">${v||'—'}</div></div>`).join('')}
                </div>
              </div>`:''}
          </div>

          <!-- SIDEBAR DO ANÚNCIO -->
          <div style="display:flex;flex-direction:column;gap:14px">
            ${isOwner ? ownerPanel(l) : ''}
            ${l.type==='RENT'?`
              <div id="rentBlock" style="background:var(--s2);border:1px solid rgba(0,245,255,.25);border-radius:12px;padding:18px">
                <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--neon);letter-spacing:2px;margin-bottom:12px">🗝️ RESERVAR VEÍCULO</div>
                ${rentalConfig?`
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
                    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.7rem;color:var(--neon)">${fmtBRL(rentalConfig.dailyRate)}<span style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace">/diária</span></div>
                    ${rentalConfig.instantBook?`<span style="font-size:.63rem;background:rgba(0,245,255,.08);border:1px solid rgba(0,245,255,.2);border-radius:6px;padding:4px 8px;color:var(--neon);font-family:'JetBrains Mono',monospace">⚡ Instantânea</span>`:''}
                  </div>
                  <div style="font-size:.68rem;color:var(--muted);margin-bottom:12px;font-family:'JetBrains Mono',monospace">
                    Disponível: ${rentalConfig.availableFrom?new Date(rentalConfig.availableFrom).toLocaleDateString('pt-BR'):'—'} a ${rentalConfig.availableTo?new Date(rentalConfig.availableTo).toLocaleDateString('pt-BR'):'—'}<br>
                    Mín. ${rentalConfig.minRentalDays||1} / Máx. ${rentalConfig.maxRentalDays||30} diárias
                  </div>
                  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
                    <div><label style="font-size:.68rem;color:var(--muted);display:block;margin-bottom:3px">RETIRADA</label>
                      <input type="date" id="rentStart" style="width:100%;background:var(--s3);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:.78rem" onchange="_rentPreview('${escHtml(l.id)}')"></div>
                    <div><label style="font-size:.68rem;color:var(--muted);display:block;margin-bottom:3px">DEVOLUÇÃO</label>
                      <input type="date" id="rentEnd" style="width:100%;background:var(--s3);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:.78rem" onchange="_rentPreview('${escHtml(l.id)}')"></div>
                  </div>
                  <div id="rentPreview" style="display:none;background:var(--s3);border:1px solid var(--border);border-radius:8px;padding:11px;margin-bottom:12px;font-size:.77rem;font-family:'JetBrains Mono',monospace"></div>
                  <button id="rentBtn" onclick="_rentBook('${escHtml(l.id)}')" style="width:100%;background:linear-gradient(135deg,var(--neon),#0891b2);color:#000;border:none;border-radius:9px;padding:11px;font-weight:700;font-size:.88rem;cursor:pointer;font-family:'Space Grotesk',sans-serif">🗝️ Reservar Agora</button>
                  <div style="font-size:.65rem;color:var(--muted);text-align:center;margin-top:6px">Sem cobrança até confirmação do anfitrião</div>
                `:`<div style="font-size:.78rem;color:var(--muted)">Configuração de aluguel não encontrada para este anúncio.</div>`}
              </div>`
            :card(`
              <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;
                color:var(--muted);letter-spacing:2px;margin-bottom:12px">VENDEDOR</div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
                <div style="width:40px;height:40px;border-radius:50%;background:var(--q2);
                  display:flex;align-items:center;justify-content:center;font-size:1rem">
                  ${l.user?.avatar?`<img src="${l.user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`:
                    l.user?.name?.[0]||'?'}
                </div>
                <div>
                  <div style="font-weight:600">${escHtml(l.user?.name||'Anônimo')}</div>
                  <div style="font-size:.73rem;color:var(--muted)">${l.city}/${l.state}</div>
                </div>
              </div>
              ${l.user?.phone?`
                <a href="https://wa.me/55${l.user.phone.replace(/\D/g,'')}" target="_blank" style="
                  display:block;width:100%;background:rgba(37,211,102,.12);color:#25d366;
                  border:1px solid rgba(37,211,102,.3);padding:10px;border-radius:8px;
                  text-align:center;font-weight:700;font-size:.84rem;text-decoration:none;margin-bottom:10px">
                  📱 WHATSAPP
                </a>`:''}
              <button onclick="_analisarAnuncioIA('${escHtml(l.id)}','${escHtml((l.title||'').replace(/'/g,"\\'")).slice(0,120)}',${l.price||0},'${escHtml(l.type||'')}','${escHtml((l.city||'').replace(/'/g,"\\'"))}','${escHtml(l.state||'')}')" style="
                width:100%;background:rgba(124,58,237,.12);color:var(--q4);
                border:1px solid rgba(124,58,237,.25);padding:10px;border-radius:8px;
                font-weight:600;font-size:.82rem;cursor:pointer">
                🤖 Analisar com IA
              </button>
              <button onclick="ChatDM.openFromListing('${escHtml(l.id)}')" style="
                width:100%;background:rgba(6,182,212,.12);color:var(--neon);margin-top:8px;
                border:1px solid rgba(6,182,212,.3);padding:10px;border-radius:8px;
                font-weight:600;font-size:.82rem;cursor:pointer">
                💬 Chat com o vendedor
              </button>
            `)}
            ${card(`
              <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;
                color:var(--muted);letter-spacing:2px;margin-bottom:10px">DETALHES</div>
              ${[
                ['Tipo', l.type],['Status', l.status],
                ['Visto', `${fmtNum(l.views)}x`],['Favoritado', `${fmtNum(l.favorites)}x`],
                ['Publicado', ago(l.publishedAt||l.createdAt)],
              ].map(([k,v])=>`<div style="display:flex;justify-content:space-between;
                padding:6px 0;border-bottom:1px solid var(--border);font-size:.78rem">
                <span style="color:var(--muted)">${k}</span>
                <span>${v||'—'}</span></div>`).join('')}
            `)}
          </div>
        </div>`;
      setTimeout(() => window.ListingGallery?.init(l.id), 0);
    } catch(e) {
      el.innerHTML = `<div style="color:var(--red);padding:32px">⚠️ ${e.message}</div>`;
    }
  }

  // Leva o usuário direto pro NEXUS-CV com o anúncio já sendo analisado,
  // em vez de abrir o chat vazio (bug reportado: 'joga pro Nexus e não fala nada').
  window._analisarAnuncioIA = function(id, title, price, type, city, state) {
    App.navigate('agentes');
    setTimeout(() => {
      if (typeof Chat === 'undefined') return;
      Chat.selectAgent('compra');
      const preco = price ? price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'não informado';
      const msg = `Analise este anúncio quanto a risco de fraude e preço justo:\n`
        + `Título: ${title}\n`
        + `Tipo: ${type}\n`
        + `Preço: ${preco}\n`
        + `Local: ${city}/${state}\n`
        + `ID do anúncio: ${id}`;
      Chat.inject(msg);
    }, 120);
  };

  // ═══════════════════════════════════════════════════════════
  // AGENTES IA
  // ═══════════════════════════════════════════════════════════
  function renderAgentes() {
    const el = main();
    if (!el) return;
    el.innerHTML = `
      ${pageHeader('AGENTES NEXUS','9 especialistas de IA quântica automotiva','var(--q3),var(--neon)')}
      <div id="agentChatContainer" style="min-height:600px">
        <div style="color:var(--muted);text-align:center;padding:48px;
          font-family:'JetBrains Mono',monospace;font-size:.73rem">⟳ Iniciando motor...</div>
      </div>`;
    setTimeout(() => {
      if (typeof Chat !== 'undefined') Chat.render('agentChatContainer','orquestrador');
    }, 50);
  }

  // ═══════════════════════════════════════════════════════════
  // EMERGÊNCIA SOS
  // ═══════════════════════════════════════════════════════════
  function renderEmergencia() {
    const el = main();
    if (!el) return;
    el.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(244,63,94,.12),rgba(249,115,22,.05));
        border:1px solid rgba(244,63,94,.3);border-radius:16px;padding:32px;margin-bottom:28px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.8rem;letter-spacing:5px;
          color:var(--red);margin-bottom:8px">🚨 CENTRAL SOS 24H</div>
        <div style="font-size:.88rem;color:var(--muted);margin-bottom:20px">
          Em caso de acidente com feridos: <strong style="color:var(--red)">SAMU 192</strong> ou
          <strong style="color:var(--red)">Bombeiros 193</strong> imediatamente.
        </div>
        <!-- Contatos rápidos -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px">
          ${[
            ['SAMU','192','#e53935'],['Bombeiros','193','#e64a19'],
            ['PRF','191','#1976d2'],['Polícia','190','#1976d2'],
          ].map(([n,num,c])=>`
            <a href="tel:${num}" style="display:flex;align-items:center;gap:8px;
              background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);
              padding:10px 18px;border-radius:8px;text-decoration:none;
              font-weight:700;font-size:.88rem;color:${c}">
              📞 ${n} — ${num}
            </a>`).join('')}
        </div>
        <!-- Tipo de emergência -->
        <div style="font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:2px;
          color:var(--red);margin-bottom:14px">QUAL EMERGÊNCIA?</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px">
          ${[
            { type:'TOW',       icon:'🚛', label:'Guincho / Reboque' },
            { type:'LOCKSMITH', icon:'🔑', label:'Chaveiro Auto'      },
            { type:'FLAT_TIRE', icon:'🔧', label:'Pneu Furado'        },
            { type:'BATTERY',   icon:'⚡', label:'Bateria Descarregada'},
            { type:'FUEL',      icon:'⛽', label:'Pane Seca'          },
            { type:'ACCIDENT',  icon:'💥', label:'Acidente'           },
            { type:'OVERHEAT',  icon:'🌡️', label:'Superaquecimento'   },
            { type:'OTHER',     icon:'❓', label:'Outro problema'      },
          ].map(e=>`
            <div onclick="Pages.openSOS('${e.type}','${e.label}')" style="
              background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.2);
              border-radius:10px;padding:14px;cursor:pointer;text-align:center;transition:all .15s"
              onmouseover="this.style.background='rgba(244,63,94,.15)'"
              onmouseout="this.style.background='rgba(244,63,94,.08)'">
              <div style="font-size:1.6rem;margin-bottom:6px">${e.icon}</div>
              <div style="font-size:.78rem;font-weight:600;color:var(--red)">${e.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- CHAT REBOQUE/EMERGÊNCIA IA -->
      <div style="font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:2px;
        color:var(--muted);margin-bottom:14px">⬡ SUPORTE IA NEXUS-RBQ</div>
      <div id="sosChatContainer"></div>
    `;
    setTimeout(() => {
      if (typeof Chat !== 'undefined') Chat.render('sosChatContainer','reboque');
    }, 50);
  }

  openSOS = async function(type, label) {
    if (!API.isAuth()) {
      App.toast('Faça login para registrar emergência.','warn');
      window.MobyaAuth?.showLogin(); return;
    }

    // Modal de confirmação com campo de descrição (sem prompt nativo)
    const modalId = 'sos-modal-' + Date.now();
    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7)',
      'display:flex;align-items:center;justify-content:center;padding:20px',
    ].join(';');
    overlay.innerHTML = `
      <div style="background:var(--s2,#1a1a2e);border:1px solid rgba(244,63,94,.4);
        border-radius:16px;padding:28px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)">
        <div style="font-size:1.6rem;margin-bottom:4px">🚨</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:3px;
          color:#f43f5e;margin-bottom:12px">${label.toUpperCase()}</div>
        <div style="font-size:.8rem;color:#94a3b8;margin-bottom:16px">
          Descreva brevemente sua situação. Sua localização será capturada automaticamente.
        </div>
        <textarea id="sos-desc-input" placeholder="Ex: Pneu furado, estou na marginal Tietê sentido Ayrton Senna..."
          style="width:100%;box-sizing:border-box;background:#0f0f1a;border:1px solid rgba(244,63,94,.3);
          color:#e2e8f0;border-radius:8px;padding:12px;font-size:.85rem;resize:vertical;
          min-height:80px;outline:none;font-family:inherit"></textarea>
        <div id="sos-geo-status" style="font-size:.72rem;color:#64748b;margin-top:8px">
          📍 Capturando localização GPS…
        </div>
        <div style="display:flex;gap:10px;margin-top:18px">
          <button id="sos-cancel-btn" style="flex:1;padding:11px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
            background:transparent;color:#94a3b8;cursor:pointer;font-size:.85rem">Cancelar</button>
          <button id="sos-confirm-btn" style="flex:2;padding:11px;border-radius:8px;border:none;
            background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff;
            font-weight:700;cursor:pointer;font-size:.85rem">🚨 Acionar Agora</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Capturar GPS em paralelo enquanto usuário digita
    let coords = {};
    const geoStatus = overlay.querySelector('#sos-geo-status');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          if (geoStatus) geoStatus.innerHTML = `✅ GPS capturado (±${Math.round(pos.coords.accuracy)}m)`;
        },
        () => {
          if (geoStatus) geoStatus.innerHTML = '⚠️ GPS indisponível — emergência sem localização exata';
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      if (geoStatus) geoStatus.innerHTML = '⚠️ GPS não suportado neste dispositivo';
    }

    const close = () => overlay.remove();
    overlay.querySelector('#sos-cancel-btn').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.querySelector('#sos-confirm-btn').onclick = async () => {
      const desc = overlay.querySelector('#sos-desc-input').value.trim();
      const btn  = overlay.querySelector('#sos-confirm-btn');
      btn.disabled = true;
      btn.textContent = 'Registrando…';
      try {
        // Se ainda sem GPS, aguarda até 6s extras
        if (!coords.latitude) {
          if (geoStatus) geoStatus.innerHTML = '📡 Aguardando GPS...';
          await new Promise((resolve) => {
            const start = Date.now();
            const check = setInterval(() => {
              if (coords.latitude || Date.now() - start > 6000) {
                clearInterval(check); resolve();
              }
            }, 300);
          });
        }
        if (!coords.latitude) {
          if (geoStatus) geoStatus.innerHTML = '⚠️ GPS indisponível — tente novamente';
          btn.disabled = false;
          btn.textContent = '🚨 Acionar Agora';
          App.toast('GPS necessário para calcular o preço. Tente novamente.', 'warn');
          return;
        }
        const created = await API.emergency.create({ type, description: desc || label, ...coords });
        close();
        App.toast(`🚨 Emergência registrada! Buscando prestador próximo…`, 'ok');
        if (typeof Chat !== 'undefined') Chat.inject(`Tive ${label.toLowerCase()}. ${desc || ''}`);
        const emergencyId = created?.data?.id || null;
        window.__mobyaPendingEmergencyId = emergencyId;
        // sos_payment_gate_applied
        // O backend cria a emergência com customerPaymentStatus=UNPAID.
        // O dispatch só dispara após o pagamento PIX ser confirmado pelo
        // webhook do MP. EmergencyPayment cuida do QR, polling e da
        // navegação para ultra-gps após confirmação.
        if (typeof EmergencyPayment !== 'undefined') {
          EmergencyPayment.showPixPayment(emergencyId);
        } else {
          // Fallback: módulo não carregado, vai direto pro GPS
          App.navigate('ultra-gps');
        }
      } catch(e) {
        btn.disabled = false;
        btn.textContent = '🚨 Acionar Agora';
        App.toast(e.message || 'Erro ao registrar emergência.', 'err');
      }
    };
  };

  // ═══════════════════════════════════════════════════════════
  // CALCULADORAS
  // ═══════════════════════════════════════════════════════════
  function renderCalculadoras() {
  if (!document.getElementById('mb-split-css')) {
    const _s = document.createElement('style');
    _s.id = 'mb-split-css';
    _s.textContent = '.mb-split{display:grid;grid-template-columns:340px 1fr;gap:20px}.mb-split--wide{grid-template-columns:380px 1fr;gap:24px;align-items:start}@media(max-width:720px){.mb-split,.mb-split--wide{grid-template-columns:1fr !important;gap:16px}}';
    document.head.appendChild(_s);
  }

    const el = main();
    if (!el) return;
    el.innerHTML = `
      ${pageHeader('CALCULADORAS QUÂNTICAS','FIPE · CDC · TCO · Consórcio','var(--gold),var(--orange)')}

      <!-- TABS -->
      <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:0">
        ${[['fipe','📊 FIPE & Avaliação'],['cdc','💰 Financiamento CDC'],['tco','🔧 Custo Total (TCO)']].map(
          ([id,lbl],i)=>`
          <button onclick="Pages.showCalcTab('${id}')" id="ctab_${id}" style="
            padding:10px 18px;border-radius:8px 8px 0 0;font-size:.82rem;font-weight:600;
            background:${i===0?'var(--s2)':'none'};color:${i===0?'var(--q4)':'var(--muted)'};
            border:${i===0?'1px solid var(--border)':' none'};border-bottom:${i===0?'1px solid var(--s2)':'none'};
            cursor:pointer;position:relative;top:1px">${lbl}
          </button>`).join('')}
      </div>

      <!-- FIPE -->
      <div id="tab_fipe">
        <div class="mb-split">
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--gold);margin-bottom:16px">⬡ CALCULADORA FIPE</div>
            ${[['fipe-modelo','Modelo (ex: Civic EXL)','text'],
               ['fipe-ano','Ano fabricação','number'],
               ['fipe-km','Quilometragem','number'],
               ['fipe-base','Valor FIPE base (R$)','number'],
               ['fipe-preco','Preço anunciado (R$) — opcional','number']].map(([id,lbl,type])=>`
              <div style="margin-bottom:12px">
                <label style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                  letter-spacing:1px;display:block;margin-bottom:4px">${lbl.toUpperCase()}</label>
                <input id="${id}" type="${type}" style="
                  width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                  padding:9px 12px;border-radius:8px;font-size:.82rem;outline:none">
              </div>`).join('')}
            <button onclick="Calc.runFipe()" style="
              width:100%;background:linear-gradient(135deg,rgba(251,191,36,.7),rgba(249,115,22,.5));
              color:var(--ink);padding:11px;border-radius:8px;font-weight:700;
              font-size:.84rem;border:none;cursor:pointer">
              📊 CALCULAR
            </button>
          </div>
          <div id="fipe-result" style="background:var(--s2);border:1px solid var(--border);
            border-radius:12px;padding:24px;min-height:200px;display:flex;align-items:center;
            justify-content:center;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem">
            Preencha o formulário e clique em Calcular.
          </div>
        </div>
      </div>

      <!-- CDC -->
      <div id="tab_cdc" style="display:none">
        <div class="mb-split">
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--q4);margin-bottom:16px">⬡ SIMULADOR CDC</div>
            ${[['cdc-val','Valor do veículo (R$)'],['cdc-ent','Entrada (R$)'],['cdc-n','Parcelas']].map(([id,lbl])=>`
              <div style="margin-bottom:12px">
                <label style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                  letter-spacing:1px;display:block;margin-bottom:4px">${lbl.toUpperCase()}</label>
                <input id="${id}" type="number" style="
                  width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                  padding:9px 12px;border-radius:8px;font-size:.82rem;outline:none">
              </div>`).join('')}
            <button onclick="Calc.runCDC()" style="
              width:100%;background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
              padding:11px;border-radius:8px;font-weight:700;font-size:.84rem;border:none;cursor:pointer">
              💰 SIMULAR
            </button>
          </div>
          <div id="cdc-result" style="background:var(--s2);border:1px solid var(--border);
            border-radius:12px;padding:24px;min-height:200px;display:flex;align-items:center;
            justify-content:center;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem">
            Preencha e clique em Simular.
          </div>
        </div>
      </div>

      <!-- TCO -->
      <div id="tab_tco" style="display:none">
        <div class="mb-split">
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--green);margin-bottom:16px">⬡ CUSTO TOTAL (TCO)</div>
            ${[['tco-val','Valor do veículo (R$)'],['tco-km','KM / mês'],['tco-cons','Consumo (km/l)'],
               ['tco-gas','Preço gasolina (R$/l)'],['tco-seg','Seguro mensal (R$)'],
               ['tco-parc','Parcela do financiamento (R$)']].map(([id,lbl])=>`
              <div style="margin-bottom:11px">
                <label style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                  letter-spacing:1px;display:block;margin-bottom:4px">${lbl.toUpperCase()}</label>
                <input id="${id}" type="number" style="
                  width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                  padding:8px 12px;border-radius:8px;font-size:.82rem;outline:none">
              </div>`).join('')}
            <button onclick="Calc.runTCO()" style="
              width:100%;background:linear-gradient(135deg,rgba(16,185,129,.7),rgba(0,245,255,.4));
              color:var(--ink);padding:11px;border-radius:8px;font-weight:700;
              font-size:.84rem;border:none;cursor:pointer">
              🔧 CALCULAR TCO
            </button>
          </div>
          <div id="tco-result" style="background:var(--s2);border:1px solid var(--border);
            border-radius:12px;padding:24px;min-height:200px;display:flex;align-items:center;
            justify-content:center;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:.73rem">
            Preencha e clique em Calcular TCO.
          </div>
        </div>
      </div>
    `;
  }

  showCalcTab = function(tab) {
    ['fipe','cdc','tco'].forEach(t => {
      const el = document.getElementById(`tab_${t}`);
      const bt = document.getElementById(`ctab_${t}`);
      if (el) el.style.display = t===tab ? '' : 'none';
      if (bt) {
        bt.style.background = t===tab ? 'var(--s2)' : 'none';
        bt.style.color      = t===tab ? 'var(--q4)' : 'var(--muted)';
        bt.style.border     = t===tab ? '1px solid var(--border)' : 'none';
        bt.style.borderBottom = t===tab ? '1px solid var(--s2)' : 'none';
      }
    });
  };

  // ═══════════════════════════════════════════════════════════
  // VISTORIA
  // ═══════════════════════════════════════════════════════════
  function renderVistoria() {
    const el = main();
    if (!el) return;
    el.innerHTML = `
      ${pageHeader('VISTORIA & LAUDO IA','Análise anti-fraude · 27 vetores de risco','var(--neon),var(--q4)')}
      <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;gap:10px;align-items:flex-start">
        <span style="font-size:1.1rem;line-height:1">ℹ️</span>
        <span style="font-size:.78rem;color:var(--muted);line-height:1.5">
          Esta é uma <strong style="color:var(--text)">análise de risco gerada por IA</strong> a partir dos dados que você informa —
          não é um laudo técnico oficial, não inspeciona o veículo fisicamente e não consulta bases de
          sinistro/leilão em tempo real. Para decisão de compra, complemente com uma
          <strong style="color:var(--text)">vistoria cautelar presencial</strong>.
        </span>
      </div>
      <div class="mb-split mb-split--wide">
        <div style="background:var(--s2);border:1px solid var(--border);border-radius:14px;padding:24px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
            color:var(--neon);margin-bottom:16px">⬡ DADOS DO VEÍCULO</div>
          ${[['viMarca','Marca','text','Toyota'],['viModelo','Modelo','text','Corolla'],
             ['viAno','Ano fabricação','number','2020'],['viKm','Quilometragem','number','45000'],
             ['viPlaca','Placa (opcional)','text','ABC1234'],['viPreco','Preço pedido (R$)','number','95000'],
            ].map(([id,lbl,type,ph])=>`
            <div style="margin-bottom:12px">
              <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                letter-spacing:1px;display:block;margin-bottom:5px">${lbl.toUpperCase()}</label>
              <input id="${id}" type="${type}" placeholder="${ph}" style="
                width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
            </div>`).join('')}
          <div style="margin-bottom:16px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">OBSERVAÇÕES / RED FLAGS</label>
            <textarea id="viObs" rows="2" placeholder="Ex: vendedor apressado, placa raspada, chassi diferente..." style="
              width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;resize:vertical"></textarea>
          </div>
          <button id="viBtnAnalyze" onclick="Pages.runVistoria()" style="
            width:100%;background:linear-gradient(135deg,rgba(0,245,255,.6),rgba(124,58,237,.5));
            color:var(--ink);padding:12px;border-radius:8px;font-weight:700;
            font-size:.88rem;border:none;cursor:pointer">
            🔍 ANALISAR COM IA
          </button>
        </div>
        <div id="viResult" style="background:var(--s2);border:1px solid var(--border);
          border-radius:14px;padding:36px;text-align:center;color:var(--muted);
          font-family:'JetBrains Mono',monospace;font-size:.73rem">
          Preencha os dados do veículo e clique em Analisar. O NEXUS-CV executará o
          <strong style="color:var(--neon)">PROTOCOLO DELTA</strong> com 27 vetores anti-fraude.
        </div>
      </div>`;
  }

  runVistoria = async function() {
    if (!API.isAuth()) { App.toast('Faça login para usar a vistoria.','warn'); window.MobyaAuth?.showLogin(); return; }
    const btn = document.getElementById('viBtnAnalyze');
    const res = document.getElementById('viResult');
    if (btn) { btn.disabled=true; btn.style.opacity='.5'; }
    res.innerHTML = `<div style="font-family:'JetBrains Mono',monospace;font-size:.73rem;color:var(--muted);padding:48px">
      ⟳ Executando PROTOCOLO DELTA — 27 vetores anti-fraude...</div>`;
    try {
      const body = {
        vehicleBrand:  document.getElementById('viMarca')?.value?.trim(),
        vehicleModel:  document.getElementById('viModelo')?.value?.trim(),
        vehicleYear:   document.getElementById('viAno')?.value,
        mileage:       document.getElementById('viKm')?.value,
        plate:         document.getElementById('viPlaca')?.value?.trim(),
        price:         document.getElementById('viPreco')?.value,
        observations:  document.getElementById('viObs')?.value?.trim(),
      };
      const r = await API.ai.fraud(body);
      const d = r.data || r;
      const riskColor = d.riskLevel==='baixo'?'var(--green)':d.riskLevel==='médio'?'var(--gold)':'var(--red)';
      res.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
            ${[
              {label:'SCORE DE RISCO',  value:`${d.riskScore}/100`, color:riskColor},
              {label:'NÍVEL',           value:d.riskLevel||'—',     color:riskColor},
              {label:'VEREDITO',        value:d.verdict?.slice(0,20)||'—', color:'var(--text)'},
            ].map(c=>`
              <div style="background:var(--s3);border:1px solid var(--border);border-radius:10px;
                padding:16px;text-align:center">
                <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;
                  color:var(--muted);margin-bottom:6px">${c.label}</div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:${c.color}">${c.value}</div>
              </div>`).join('')}
          </div>
          ${d.flags?.length?`
            <div style="background:rgba(244,63,94,.07);border:1px solid rgba(244,63,94,.2);
              border-radius:10px;padding:16px">
              <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;
                color:var(--red);letter-spacing:2px;margin-bottom:10px">🚨 FLAGS DE RISCO</div>
              ${d.flags.map(f=>`<div style="font-size:.8rem;color:var(--muted);padding:3px 0">⚠️ ${f}</div>`).join('')}
            </div>`:''}
          ${d.recommendations?.length?`
            <div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.2);
              border-radius:10px;padding:16px">
              <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;
                color:var(--green);letter-spacing:2px;margin-bottom:10px">✅ RECOMENDAÇÕES</div>
              ${d.recommendations.map(r=>`<div style="font-size:.8rem;color:var(--muted);padding:3px 0">→ ${r}</div>`).join('')}
            </div>`:''}
        </div>`;
    } catch(e) {
      res.innerHTML = `<div style="color:var(--red);padding:32px">⚠️ ${e.message}</div>`;
    } finally {
      if (btn) { btn.disabled=false; btn.style.opacity='1'; }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // DOCUMENTAÇÃO
  // ═══════════════════════════════════════════════════════════
  function renderDocumentacao() {
    const el = main();
    if (!el) return;
    el.innerHTML = `
      ${pageHeader('DOCUMENTAÇÃO AUTOMOTIVA','DETRAN · IPVA · Licenciamento · Transferência','var(--q4),var(--green)')}
      <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;gap:10px;align-items:flex-start">
        <span style="font-size:1.1rem;line-height:1">ℹ️</span>
        <span style="font-size:.78rem;color:var(--muted);line-height:1.5">
          As respostas aqui são geradas por <strong style="color:var(--text)">inteligência artificial</strong> com base em conhecimento geral —
          não consultam diretamente DETRAN, Receita Federal ou SISCOMEX. Use como orientação inicial e
          <strong style="color:var(--text)">sempre confirme valores, prazos e exigências no site oficial do seu estado</strong> antes de agir.
        </span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:28px">
        ${[
          { icon:'📋', title:'Transferência de Veículo', desc:'Documentos, taxas DETRAN, prazo legal de 30 dias.', btn:'Consultar IA', agent:'compra' },
          { icon:'💳', title:'IPVA 2025', desc:'Calendário por estado, parcelamento, desconto à vista.', btn:'Calcular IPVA', agent:'compra' },
          { icon:'🔖', title:'Licenciamento Anual', desc:'Prazo, taxa DPVAT, vistoria obrigatória, débitos.', btn:'Verificar', agent:'compra' },
          { icon:'⚠️', title:'Recall e Gravame', desc:'Como verificar recall, alienação fiduciária, leilão.', btn:'Checar agora', agent:'compra' },
          { icon:'🛂', title:'Importação de Veículo', desc:'II, IPI, ICMS, SISCOMEX — guia completo.', btn:'Saiba mais', agent:'orquestrador' },
          { icon:'♻️', title:'Baixa e Desemplacamento', desc:'Sucateamento, furto/roubo, saída definitiva.', btn:'Orientação IA', agent:'compra' },
        ].map(d=>`
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px">
            <div style="font-size:2rem;margin-bottom:10px">${d.icon}</div>
            <div style="font-weight:600;font-size:.93rem;margin-bottom:6px">${d.title}</div>
            <div style="font-size:.78rem;color:var(--muted);line-height:1.5;margin-bottom:14px">${d.desc}</div>
            <button onclick="App.navigate('agentes');setTimeout(()=>Chat.selectAgent('${d.agent}',document.querySelector('.achip')),200)" style="
              background:rgba(124,58,237,.1);color:var(--q4);border:1px solid rgba(124,58,237,.2);
              padding:8px 16px;border-radius:7px;font-size:.78rem;font-weight:600;cursor:pointer">
              🤖 ${d.btn}
            </button>
          </div>`).join('')}
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD (admin / usuário)
  // ═══════════════════════════════════════════════════════════
  async function renderDashboard() {
    const el = main();
    if (!el) return;
    if (!API.isAuth()) {
      el.innerHTML = `<div style="text-align:center;padding:64px">
        <div style="font-size:3rem;margin-bottom:16px">🔒</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--muted)">ACESSO RESTRITO</div>
        <div style="font-size:.84rem;color:var(--muted);margin:12px 0 24px">Faça login para ver seu dashboard.</div>
        <button onclick="window.MobyaAuth?.showLogin()" style="
          background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
          padding:12px 28px;border-radius:8px;font-weight:700;border:none;cursor:pointer">
          ENTRAR
        </button>
      </div>`; return;
    }
    el.innerHTML = `${pageHeader('MEU DASHBOARD','Anúncios · Reservas recebidas · Conversas · Cotações','var(--q4),var(--neon)')}
      <div id="dashContent">${skeleton(4)}</div>`;

    try {
      const [listingsR, quotesR, emergenciesR, hostBookingsR, sellerThreadsR] = await Promise.all([
        API.listings.mine({ limit: 10 }).catch(() => null),
        API.monetization.quotes({ limit: 5 }).catch(() => null),
        API.emergency.mine({ limit: 10 }).catch(() => null),
        API.rental.hostBookings({ limit: 5 }).catch(() => null),
        API.chat.threads({ role: 'seller', limit: 5 }).catch(() => null),
      ]);
      const listings    = listingsR?.data || [];
      const quotes      = quotesR?.data?.quotes || quotesR?.data || [];
      const emergencies = emergenciesR?.data || [];
      const activeEmerg = emergencies.filter(e => !['COMPLETED','CANCELLED'].includes(e.status));
      const hostBookings   = hostBookingsR?.data || [];
      const sellerThreads  = sellerThreadsR?.data || [];
      const BOOKING_LABELS_D = { PENDING:'Aguardando você', CONFIRMED:'Confirmada', ACTIVE:'Em andamento',
        COMPLETED:'Concluída', DECLINED:'Recusada', CANCELLED:'Cancelada', DISPUTED:'Em disputa' };
      const BOOKING_COLORS_D = { PENDING:'var(--gold)', CONFIRMED:'var(--neon)', ACTIVE:'var(--green)',
        COMPLETED:'var(--muted)', DECLINED:'var(--red)', CANCELLED:'var(--red)', DISPUTED:'var(--orange)' };

      document.getElementById('dashContent').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">
          ${[
            {label:'MEUS ANÚNCIOS',      value:fmtNum(listingsR?.pagination?.total||listings.length), color:'var(--q4)'},
            {label:'MINHAS COTAÇÕES',    value:fmtNum(quotesR?.pagination?.total||quotes.length),   color:'var(--green)'},
            {label:'EMERGÊNCIAS ATIVAS', value:fmtNum(activeEmerg.length), color: activeEmerg.length ? 'var(--red)' : 'var(--neon)'},
            {label:'RESERVAS RECEBIDAS', value:fmtNum(hostBookingsR?.pagination?.total||hostBookings.length), color:'var(--gold)'},
          ].map(k=>`
            <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:18px;text-align:center">
              <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);margin-bottom:8px">${k.label}</div>
              <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${k.color}">${k.value}</div>
            </div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--q4);margin-bottom:12px">⬡ MEUS ANÚNCIOS</div>
            ${listings.length
              ? listings.map(l=>ownerMiniCard(l)).join('')
              : `<div style="color:var(--muted);font-size:.8rem;padding:24px;text-align:center">
                  Nenhum anúncio publicado.
                  <button onclick="Pages.showCreateListing()" style="background:none;color:var(--q4);
                    border:none;cursor:pointer;display:block;margin:10px auto;font-weight:600">
                    + Publicar primeiro</button></div>`}
          </div>
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--green);margin-bottom:12px">💰 MINHAS COTAÇÕES</div>
            ${quotes.length
              ? (() => {
                  window.__mobyaQuoteCache = window.__mobyaQuoteCache || {};
                  quotes.forEach(q => { window.__mobyaQuoteCache[q.id] = q; });
                  return quotes.map(q=>`
                <div onclick="Monetization.openClientQuoteDetail('${q.id}')" style="background:var(--s2);border:1px solid var(--border);border-radius:8px;
                  padding:12px;margin-bottom:8px;font-size:.8rem;cursor:pointer;transition:border-color .15s"
                  onmouseover="this.style.borderColor='var(--border2)'"
                  onmouseout="this.style.borderColor='var(--border)'">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-weight:600">${q.vertical}</span>
                    <span style="font-family:'JetBrains Mono',monospace;font-size:.68rem;
                      color:${q.status==='COMPLETED'?'var(--green)':q.status==='ACCEPTED'?'var(--gold)':'var(--muted)'}">${q.status}</span>
                  </div>
                  <div style="color:var(--muted);font-size:.76rem">${escHtml((q.description||'').slice(0,60))}…</div>
                </div>`).join('');
                })()
              : `<div style="color:var(--muted);font-size:.8rem;padding:24px;text-align:center">
                  Nenhuma cotação ainda. <button onclick="App.navigate('monetizacao')" style="background:none;
                    color:var(--green);border:none;cursor:pointer;font-weight:600">Solicitar agora</button></div>`}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px">
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--gold);margin-bottom:12px">🗝️ RESERVAS RECEBIDAS</div>
            ${hostBookings.length
              ? hostBookings.map(b=>`
                <div onclick="App.navigate('painel-anfitriao')" style="display:flex;justify-content:space-between;
                  align-items:center;background:var(--s2);border:1px solid var(--border);border-radius:8px;
                  padding:12px;margin-bottom:8px;cursor:pointer">
                  <div>
                    <div style="font-weight:600;font-size:.82rem">${escHtml(b.config?.listing?.title || 'Reserva')}</div>
                    <div style="color:var(--muted);font-size:.72rem;margin-top:2px">
                      ${b.startDate ? new Date(b.startDate).toLocaleDateString('pt-BR') : ''} → ${b.endDate ? new Date(b.endDate).toLocaleDateString('pt-BR') : ''}
                    </div>
                  </div>
                  <span style="font-size:.66rem;font-weight:700;color:${BOOKING_COLORS_D[b.status]||'var(--muted)'};
                    background:rgba(255,255,255,.05);padding:3px 9px;border-radius:6px">${BOOKING_LABELS_D[b.status]||b.status}</span>
                </div>`).join('')
              : `<div style="color:var(--muted);font-size:.8rem;padding:24px;text-align:center">
                  Nenhuma reserva recebida ainda.</div>`}
            ${hostBookings.length ? `<div onclick="App.navigate('painel-anfitriao')" style="text-align:center;
              padding:10px;color:var(--gold);cursor:pointer;font-size:.78rem;font-weight:600">Ver Painel Anfitrião →</div>` : ''}
          </div>
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--neon);margin-bottom:12px">💬 CONVERSAS COMO VENDEDOR</div>
            ${sellerThreads.length
              ? sellerThreads.map(t=>`
                <div onclick="ChatDM.open('${t.id}')" style="display:flex;justify-content:space-between;
                  align-items:center;background:var(--s2);border:1px solid var(--border);border-radius:8px;
                  padding:12px;margin-bottom:8px;cursor:pointer">
                  <div style="min-width:0">
                    <div style="font-weight:600;font-size:.82rem">${escHtml(t.buyer?.name || 'Comprador')}</div>
                    <div style="color:var(--muted);font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      ${escHtml(t.listing?.title || '')}${t.messages?.[0] ? ' · ' + escHtml(t.messages[0].content) : ''}
                    </div>
                  </div>
                </div>`).join('')
              : `<div style="color:var(--muted);font-size:.8rem;padding:24px;text-align:center">
                  Nenhuma conversa recebida ainda.</div>`}
            ${sellerThreads.length ? `<div onclick="App.navigate('conversas')" style="text-align:center;
              padding:10px;color:var(--neon);cursor:pointer;font-size:.78rem;font-weight:600">Ver todas as conversas →</div>` : ''}
          </div>
        </div>
      `;
    } catch(e) {
      document.getElementById('dashContent').innerHTML =
        `<div style="color:var(--red);padding:32px">⚠️ ${e.message}</div>`;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRO PÚBLICO DE RENDERERS
  // ═══════════════════════════════════════════════════════════
// ============================================================
// MOBYA — PEÇAS & ACESSÓRIOS + SERVIÇOS AUTOMOTIVOS
// Adicionar este bloco em pages.js, dentro do window.Pages = (() => { ... })()
// antes do "return { ... };" final.
//
// Em app.js, substituir:
//   pecas:    () => comingSoon('PEÇAS & ACESSÓRIOS','⚙️'),
//   servicos: () => comingSoon('SERVIÇOS AUTOMOTIVOS','🔨'),
// por:
//   pecas:    () => Pages.renderPecas(),
//   servicos: () => Pages.renderServicos(),
// ============================================================

  // ═══════════════════════════════════════════════════════════
  // PEÇAS & ACESSÓRIOS
  // ═══════════════════════════════════════════════════════════

  const PART_CATEGORIES = [
    { v:'', label:'Todas as categorias' },
    { v:'motor',       label:'🔩 Motor & Transmissão' },
    { v:'suspensao',   label:'🔧 Suspensão & Direção' },
    { v:'freios',      label:'🛑 Freios' },
    { v:'eletrica',    label:'⚡ Elétrica & Eletrônica' },
    { v:'carroceria',  label:'🚗 Carroceria & Lataria' },
    { v:'interior',    label:'💺 Interior & Acessórios' },
    { v:'pneus',       label:'⭕ Pneus & Rodas' },
    { v:'escapamento', label:'💨 Escapamento' },
    { v:'arrefecimento',label:'🌡️ Arrefecimento' },
    { v:'combustivel', label:'⛽ Combustível & Filtros' },
    { v:'performance', label:'🏎️ Performance & Tuning' },
  ];

  const PART_BRANDS = ['Todas','Bosch','Mahle','SKF','Monroe','Cofap','Bendix','NGK','Mann','Valeo','Delphi','Continental','TRW','Denso','AC Delco'];

  async function renderPecas() {
    const el = main();
    if (!el) return;

    el.innerHTML = `
      ${pageHeader('PEÇAS & ACESSÓRIOS', 'Marketplace de peças · Originais · Paralelas · Performance', 'var(--gold),var(--orange)')}

      <!-- COTAÇÃO RÁPIDA POR VEÍCULO (heurística + NEXUS-PD) -->
      <div class="px-card" style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:24px">
        <div class="px-card-title" style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:10px">
          ◈ COTAÇÃO RÁPIDA POR VEÍCULO
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
          <div style="flex:1;min-width:120px">
            <input id="pecaMarca" placeholder="Marca" style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>
          <div style="flex:1;min-width:120px">
            <input id="pecaModelo" placeholder="Modelo" style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>
          <div style="flex:0 0 90px">
            <input id="pecaAno" type="number" placeholder="Ano" style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>
          <div style="flex:1;min-width:160px">
            <input id="pecaNome" placeholder="Ex: pastilha de freio" style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>
          <div style="flex:0 0 70px">
            <input id="pecaQtd" type="number" min="1" value="1" style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>
          <div style="flex:0 0 120px">
            <select id="pecaUrgencia" style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <button onclick="Pages.cotarPeca()" style="background:linear-gradient(135deg,var(--gold),var(--orange));color:#000;padding:9px 22px;border-radius:8px;font-weight:700;font-size:.82rem;border:none;cursor:pointer;white-space:nowrap">
            Cotar
          </button>
        </div>
        <div id="pecaResultados" style="display:none;margin-top:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px"></div>
      </div>

      <!-- FILTROS -->
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;
        padding:20px;margin-bottom:24px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">

          <div style="flex:2;min-width:200px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">BUSCA</label>
            <input id="pcQuery" placeholder="Ex: pastilha de freio Civic 2022..."
              onkeydown="if(event.key==='Enter')Pages.searchPecas()"
              style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>

          <div style="flex:1;min-width:160px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">CATEGORIA</label>
            <select id="pcCat" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              ${PART_CATEGORIES.map(c => `<option value="${c.v}">${c.label}</option>`).join('')}
            </select>
          </div>

          <div style="flex:1;min-width:130px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">MARCA DA PEÇA</label>
            <select id="pcBrand" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              ${PART_BRANDS.map(b => `<option value="${b === 'Todas' ? '' : b}">${b}</option>`).join('')}
            </select>
          </div>

          <div style="flex:1;min-width:110px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">ESTADO</label>
            <select id="pcCondition" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              <option value="">Todos</option>
              <option value="nova">🟢 Nova</option>
              <option value="usada">🟡 Usada</option>
              <option value="recondicionada">🔵 Recondicionada</option>
            </select>
          </div>

          <div style="flex:1;min-width:110px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">CIDADE</label>
            <input id="pcCity" placeholder="São Paulo"
              style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>

          <div style="flex:1;min-width:130px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">PREÇO MÁX (R$)</label>
            <input id="pcMaxPrice" type="number" placeholder="Sem limite"
              style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>

          <div style="display:flex;gap:8px;align-items:center">
            <button onclick="Pages.searchPecas()" style="
              background:linear-gradient(135deg,var(--gold),var(--orange));color:#000;
              padding:9px 22px;border-radius:8px;font-weight:700;font-size:.82rem;
              border:none;cursor:pointer;white-space:nowrap;box-shadow:0 0 14px rgba(245,158,11,.3)">
              Buscar
            </button>
            <button onclick="Pages.showCreateListing('PART')" style="
              background:rgba(245,158,11,.1);color:var(--gold);border:1px solid rgba(245,158,11,.25);
              padding:9px 16px;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap">
              + Anunciar Peça
            </button>
          </div>
        </div>

        <!-- Tags de compatibilidade rápida -->
        <div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <span style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace">FILTRAR POR:</span>
          ${['Honda Civic','Toyota Corolla','Volkswagen Gol','Fiat Uno','Chevrolet Onix','Ford Ka','Jeep Renegade'].map(car => `
            <button onclick="document.getElementById('pcQuery').value='${car}';Pages.searchPecas()" style="
              background:var(--s3);border:1px solid var(--border);color:var(--muted);
              padding:4px 10px;border-radius:6px;font-size:.72rem;cursor:pointer;
              font-family:'Space Grotesk',sans-serif;transition:all .15s"
              onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold)'"
              onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
              ${car}
            </button>`).join('')}
        </div>
      </div>

      <div id="pcResults" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
        ${skeleton(8)}
      </div>
      <div id="pcPager" style="display:flex;justify-content:center;gap:8px;margin-top:24px"></div>
    `;

    Pages.searchPecas && Pages.searchPecas();
  }

  let pcPage = 1;

  async function cotarPeca() {
    if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }

    const brand = document.getElementById('pecaMarca')?.value?.trim();
    const model = document.getElementById('pecaModelo')?.value?.trim();
    const year  = document.getElementById('pecaAno')?.value;
    const part  = document.getElementById('pecaNome')?.value?.trim();
    const qty   = parseInt(document.getElementById('pecaQtd')?.value) || 1;
    const urg   = document.getElementById('pecaUrgencia')?.value;

    if (!brand || !model || !part) { Toast?.show('Preencha marca, modelo e peça','err'); return; }

    Toast?.show('🔩 Cotando peças...','info');
    try {
      const r = await API.post('/monetization/parts/quote', {
        vehicleBrand: brand, vehicleModel: model, vehicleYear: year,
        partName: part, quantity: qty, urgency: urg,
      });

      const container = document.getElementById('pecaResultados');
      if (!container) return;

      container.innerHTML = r.data.options.map((o, i) => `
        <div style="background:var(--s3);border:1px solid ${i===1?'var(--gold)':'var(--border)'};border-radius:10px;padding:14px;position:relative">
          ${i===1?'<div style="position:absolute;top:-9px;right:10px;background:var(--gold);color:#000;font-size:.62rem;font-weight:700;padding:2px 8px;border-radius:6px">RECOMENDADO</div>':''}
          <div style="font-weight:700;font-size:.85rem">${o.label}</div>
          <div style="font-size:.72rem;color:var(--muted);margin:4px 0 8px">Garantia: ${o.warranty} · ${o.availability}</div>
          <div style="font-size:1.05rem;font-weight:700;color:var(--gold)">R$ ${o.total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
          <div style="font-size:.74rem;color:var(--muted);margin-bottom:8px">Unitário: R$ ${o.unit.toLocaleString('pt-BR',{minimumFractionDigits:2})} × ${qty}</div>
          <button onclick="Pages.solicitarPeca('${o.type}','${r.data.quoteId}')" style="width:100%;background:rgba(245,158,11,.12);color:var(--gold);border:1px solid rgba(245,158,11,.3);padding:8px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer">
            Solicitar ${o.label}
          </button>
        </div>`).join('') +
        (r.data.tips?.length ? `
          <div style="grid-column:1/-1;background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:14px">
            <div style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:1px;margin-bottom:6px">◈ DICAS</div>
            ${r.data.tips.map(t => `<div style="font-size:.8rem;color:var(--muted);margin-bottom:4px">💡 ${t}</div>`).join('')}
          </div>` : '');

      container.style.display = 'grid';
      container.scrollIntoView({ behavior:'smooth' });
      Toast?.show('✅ Cotação gerada!','ok');
    } catch(e) {
      Toast?.show(e.message || 'Erro ao cotar peças.','err');
    }
  }

  async function solicitarPeca(tipo, quoteId) {
    if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
    Toast?.show(`🔩 Solicitação de peça ${tipo} registrada! Nossa rede entrará em contato.`,'ok');
  }

  searchPecas = async function(page = 1) {
    pcPage = page;
    const results = document.getElementById('pcResults');
    if (!results) return;
    results.innerHTML = skeleton(8);

    const query    = document.getElementById('pcQuery')?.value?.trim()    || undefined;
    const cat      = document.getElementById('pcCat')?.value              || undefined;
    const brand    = document.getElementById('pcBrand')?.value            || undefined;
    const cond     = document.getElementById('pcCondition')?.value        || undefined;
    const city     = document.getElementById('pcCity')?.value?.trim()     || undefined;
    const maxPrice = document.getElementById('pcMaxPrice')?.value         || undefined;

    // Monta query combinando campos de texto
    const combinedQuery = [query, cat, brand, cond].filter(Boolean).join(' ') || undefined;

    const params = {
      page, limit: 12,
      type: 'PART',
      sort: 'recent',
      ...(combinedQuery && { query: combinedQuery }),
      ...(city          && { city }),
      ...(maxPrice      && { maxPrice }),
    };

    try {
      const r = await API.listings.search(params);
      const listings   = r.data || [];
      const pagination = r.pagination || {};

      if (!listings.length) {
        results.innerHTML = `
          <div style="color:var(--muted);padding:60px;text-align:center;grid-column:1/-1">
            <div style="font-size:2.5rem;margin-bottom:12px">⚙️</div>
            <div style="font-size:.88rem;margin-bottom:8px">Nenhuma peça encontrada com esses filtros.</div>
            <div style="font-size:.75rem;color:var(--muted)">Tente outros termos ou seja o primeiro a anunciar!</div>
            <button onclick="Pages.showCreateListing('PART')" style="
              margin-top:16px;background:rgba(245,158,11,.1);color:var(--gold);
              border:1px solid rgba(245,158,11,.25);padding:10px 22px;border-radius:8px;
              font-size:.82rem;font-weight:600;cursor:pointer">
              + Anunciar Peça
            </button>
          </div>`;
        return;
      }

      results.innerHTML = listings.map(l => partCard(l)).join('');

      const pager = document.getElementById('pcPager');
      if (pager && pagination.totalPages > 1) {
        const pages = Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1);
        pager.innerHTML = pages.map(p => `
          <button onclick="Pages.searchPecas(${p})" style="
            padding:7px 13px;border-radius:6px;font-size:.8rem;cursor:pointer;
            background:${p === pcPage ? 'var(--gold)' : 'var(--s3)'};
            color:${p === pcPage ? '#000' : 'var(--muted)'};
            border:1px solid ${p === pcPage ? 'var(--gold)' : 'var(--border)'}">
            ${p}
          </button>`).join('');
      }
    } catch (e) {
      results.innerHTML = `<div style="color:var(--red);padding:32px;text-align:center;grid-column:1/-1">
        ⚠️ ${e.message}</div>`;
    }
  };

  function partCard(l) {
    const imgs = parseImages(l.images);
    return `
      <div onclick="App.navigate('listing',${JSON.stringify(l.id)})" style="
        background:var(--s2);border:1px solid var(--border);border-radius:12px;
        overflow:hidden;cursor:pointer;transition:all .18s"
        onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='var(--gold)'"
        onmouseout="this.style.transform='translateY(0)';this.style.borderColor='var(--border)'">
        <div style="height:150px;background:var(--s3);position:relative;overflow:hidden">
          ${imgs[0]
            ? `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover">`
            : `<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:2.8rem">⚙️</div>`}
          <span style="position:absolute;top:8px;left:8px;font-family:'JetBrains Mono',monospace;
            font-size:.58rem;padding:3px 8px;border-radius:4px;
            background:rgba(0,0,0,.75);color:var(--gold);border:1px solid rgba(245,158,11,.3)">
            PEÇA
          </span>
          ${l.priceNegotiable ? `<span style="position:absolute;top:8px;right:8px;font-family:'JetBrains Mono',monospace;
            font-size:.55rem;padding:3px 7px;border-radius:4px;
            background:rgba(0,0,0,.7);color:var(--muted);border:1px solid var(--border)">
            negociável</span>` : ''}
          ${window.ListingGallery ? ListingGallery.cardBadge(imgs) : ''}
        </div>
        <div style="padding:14px">
          <div style="font-weight:600;font-size:.86rem;margin-bottom:6px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(l.title)}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:var(--gold);margin-bottom:8px">
            ${fmtBRL(l.price)}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:.72rem;color:var(--muted)">📍 ${escHtml(l.city)}/${l.state}</span>
            <span style="font-size:.68rem;color:var(--muted)">${ago(l.createdAt)}</span>
          </div>
          ${l.user ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);
            font-size:.7rem;color:var(--muted)">
            👤 ${escHtml(l.user.name || 'Vendedor')}
            · 👁 ${fmtNum(l.views)}
          </div>` : ''}
        </div>
      </div>`;
  }


  // ═══════════════════════════════════════════════════════════
  // SERVIÇOS AUTOMOTIVOS
  // ═══════════════════════════════════════════════════════════

  const SERVICE_CATEGORIES = [
    { v:'', label:'Todos os serviços' },
    { v:'revisao',      label:'🔍 Revisão Preventiva' },
    { v:'funilaria',    label:'🔨 Funilaria & Pintura' },
    { v:'eletrica',     label:'⚡ Elétrica Automotiva' },
    { v:'mecanica',     label:'🔧 Mecânica Geral' },
    { v:'pneus',        label:'⭕ Pneus & Alinhamento' },
    { v:'ar',           label:'❄️ Ar Condicionado' },
    { v:'injecao',      label:'💉 Injeção Eletrônica' },
    { v:'cambio',       label:'⚙️ Câmbio & Transmissão' },
    { v:'vidros',       label:'🪟 Vidros & Películas' },
    { v:'som',          label:'🔊 Som & Multimídia' },
    { v:'higienizacao', label:'🧹 Higienização & Estética' },
    { v:'diagnostico',  label:'💻 Diagnóstico Eletrônico' },
    { v:'gnv',          label:'⛽ GNV & Conversão' },
  ];

  async function renderServicos() {
    const el = main();
    if (!el) return;

    el.innerHTML = `
      ${pageHeader('SERVIÇOS AUTOMOTIVOS', 'Oficinas · Especialistas · Agendamento', 'var(--neon),var(--q4)')}

      <!-- FILTROS -->
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;
        padding:20px;margin-bottom:24px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">

          <div style="flex:2;min-width:200px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">BUSCA</label>
            <input id="svQuery" placeholder="Ex: alinhamento balanceamento Honda..."
              onkeydown="if(event.key==='Enter')Pages.searchServicos()"
              style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>

          <div style="flex:1;min-width:180px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">CATEGORIA</label>
            <select id="svCat" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              ${SERVICE_CATEGORIES.map(c => `<option value="${c.v}">${c.label}</option>`).join('')}
            </select>
          </div>

          <div style="flex:1;min-width:120px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">CIDADE</label>
            <input id="svCity" placeholder="São Paulo"
              style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>

          <div style="flex:1;min-width:130px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">PREÇO MÁX (R$)</label>
            <input id="svMaxPrice" type="number" placeholder="Sem limite"
              style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
          </div>

          <div style="flex:1;min-width:110px">
            <label style="font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">ORDENAR</label>
            <select id="svSort" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;cursor:pointer">
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="views">Mais vistos</option>
            </select>
          </div>

          <div style="display:flex;gap:8px;align-items:center">
            <button onclick="Pages.searchServicos()" style="
              background:linear-gradient(135deg,var(--neon),var(--q4));color:#fff;
              padding:9px 22px;border-radius:8px;font-weight:700;font-size:.82rem;
              border:none;cursor:pointer;white-space:nowrap;box-shadow:0 0 14px rgba(16,185,129,.25)">
              Buscar
            </button>
            <button onclick="Pages.showCreateListing('SERVICE')" style="
              background:rgba(16,185,129,.1);color:var(--green);border:1px solid rgba(16,185,129,.25);
              padding:9px 16px;border-radius:8px;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap">
              + Oferecer Serviço
            </button>
          </div>
        </div>

        <!-- Atalhos de categoria rápida -->
        <div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <span style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace">POPULAR:</span>
          ${[
            { v:'revisao', label:'🔍 Revisão' },
            { v:'funilaria', label:'🔨 Funilaria' },
            { v:'pneus', label:'⭕ Pneus' },
            { v:'ar', label:'❄️ A/C' },
            { v:'eletrica', label:'⚡ Elétrica' },
            { v:'higienizacao', label:'🧹 Estética' },
          ].map(item => `
            <button onclick="document.getElementById('svCat').value='${item.v}';Pages.searchServicos()" style="
              background:var(--s3);border:1px solid var(--border);color:var(--muted);
              padding:4px 10px;border-radius:6px;font-size:.72rem;cursor:pointer;
              font-family:'Space Grotesk',sans-serif;transition:all .15s"
              onmouseover="this.style.borderColor='var(--neon)';this.style.color='var(--neon)'"
              onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
              ${item.label}
            </button>`).join('')}
        </div>
      </div>

      <div id="svResults" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${skeleton(6)}
      </div>
      <div id="svPager" style="display:flex;justify-content:center;gap:8px;margin-top:24px"></div>
    `;

    Pages.searchServicos && Pages.searchServicos();
  }

  let svPage = 1;

  searchServicos = async function(page = 1) {
    svPage = page;
    const results = document.getElementById('svResults');
    if (!results) return;
    results.innerHTML = skeleton(6);

    const query    = document.getElementById('svQuery')?.value?.trim()    || undefined;
    const cat      = document.getElementById('svCat')?.value              || undefined;
    const city     = document.getElementById('svCity')?.value?.trim()     || undefined;
    const maxPrice = document.getElementById('svMaxPrice')?.value         || undefined;
    const sort     = document.getElementById('svSort')?.value             || 'recent';

    const combinedQuery = [query, cat].filter(Boolean).join(' ') || undefined;

    const params = {
      page, limit: 12,
      type: 'SERVICE',
      sort,
      ...(combinedQuery && { query: combinedQuery }),
      ...(city          && { city }),
      ...(maxPrice      && { maxPrice }),
    };

    try {
      const r = await API.listings.search(params);
      const listings   = r.data || [];
      const pagination = r.pagination || {};

      if (!listings.length) {
        results.innerHTML = `
          <div style="color:var(--muted);padding:60px;text-align:center;grid-column:1/-1">
            <div style="font-size:2.5rem;margin-bottom:12px">🔨</div>
            <div style="font-size:.88rem;margin-bottom:8px">Nenhum serviço encontrado com esses filtros.</div>
            <div style="font-size:.75rem;color:var(--muted)">Seja o primeiro a oferecer serviços na sua cidade!</div>
            <button onclick="Pages.showCreateListing('SERVICE')" style="
              margin-top:16px;background:rgba(16,185,129,.1);color:var(--green);
              border:1px solid rgba(16,185,129,.25);padding:10px 22px;border-radius:8px;
              font-size:.82rem;font-weight:600;cursor:pointer">
              + Oferecer Serviço
            </button>
          </div>`;
        return;
      }

      results.innerHTML = listings.map(l => serviceCard(l)).join('');

      const pager = document.getElementById('svPager');
      if (pager && pagination.totalPages > 1) {
        const pages = Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1);
        pager.innerHTML = pages.map(p => `
          <button onclick="Pages.searchServicos(${p})" style="
            padding:7px 13px;border-radius:6px;font-size:.8rem;cursor:pointer;
            background:${p === svPage ? 'var(--neon)' : 'var(--s3)'};
            color:${p === svPage ? '#000' : 'var(--muted)'};
            border:1px solid ${p === svPage ? 'var(--neon)' : 'var(--border)'}">
            ${p}
          </button>`).join('');
      }
    } catch (e) {
      results.innerHTML = `<div style="color:var(--red);padding:32px;text-align:center;grid-column:1/-1">
        ⚠️ ${e.message}</div>`;
    }
  };

  function serviceCard(l) {
    // Detecta categoria pelo título/descrição para exibir ícone
    const catIcons = { revisao:'🔍', funilaria:'🔨', eletrica:'⚡', mecanica:'🔧',
                       pneus:'⭕', ar:'❄️', injecao:'💉', cambio:'⚙️',
                       vidros:'🪟', som:'🔊', higienizacao:'🧹', diagnostico:'💻', gnv:'⛽' };
    const titleLower = (l.title || '').toLowerCase();
    const detectedIcon = Object.entries(catIcons).find(([k]) => titleLower.includes(k))?.[1] || '🔧';

    return `
      <div onclick="App.navigate('listing',${JSON.stringify(l.id)})" style="
        background:var(--s2);border:1px solid var(--border);border-radius:12px;
        padding:0;overflow:hidden;cursor:pointer;transition:all .18s"
        onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='var(--neon)'"
        onmouseout="this.style.transform='translateY(0)';this.style.borderColor='var(--border)'">

        <!-- Cabeçalho colorido em vez de imagem (serviços raramente têm foto) -->
        <div style="height:80px;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(124,58,237,.08));
          border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:14px">
          <div style="width:48px;height:48px;border-radius:12px;background:rgba(16,185,129,.12);
            border:1px solid rgba(16,185,129,.2);display:flex;align-items:center;justify-content:center;
            font-size:1.5rem;flex-shrink:0">
            ${detectedIcon}
          </div>
          <div>
            <div style="font-size:.65rem;font-family:'JetBrains Mono',monospace;color:var(--neon);
              letter-spacing:1px;margin-bottom:3px">SERVIÇO AUTOMOTIVO</div>
            <div style="font-size:.72rem;color:var(--muted)">📍 ${escHtml(l.city)}/${l.state}</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:.62rem;color:var(--muted)">${ago(l.createdAt)}</div>
            <div style="font-size:.62rem;color:var(--muted)">👁 ${fmtNum(l.views)}</div>
          </div>
        </div>

        <div style="padding:16px">
          <div style="font-weight:600;font-size:.9rem;margin-bottom:8px;line-height:1.3">
            ${escHtml(l.title)}
          </div>
          <div style="font-size:.78rem;color:var(--muted);margin-bottom:10px;
            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${escHtml(l.description || '')}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:var(--neon)">
              ${l.price > 0 ? fmtBRL(l.price) : 'Consultar'}
              ${l.priceNegotiable ? `<span style="font-size:.6rem;color:var(--muted);
                font-family:'Space Grotesk',sans-serif"> · negociável</span>` : ''}
            </div>
            ${l.user ? `<div style="font-size:.7rem;color:var(--muted)">
              👤 ${escHtml(l.user.name || 'Prestador')}
            </div>` : ''}
          </div>
        </div>
      </div>`;
  }


  // ═══════════════════════════════════════════════════════════
  // ATUALIZAR showCreateListing para aceitar tipo pré-selecionado
  // Substituir a função showCreateListing existente por esta:
  // ═══════════════════════════════════════════════════════════

  showCreateListing = function(preType = 'SALE', editData = null) {
    if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
    const modals = document.getElementById('modals');
    if (!modals) return;

    window._editingListingId = editData?.id || null;
    const isEdit = !!editData;

    const typeOptions = [
      { v:'SALE',    l:'🚗 Venda de Veículo' },
      { v:'RENT',    l:'🗝️ Aluguel' },
      { v:'PART',    l:'⚙️ Peça & Acessório' },
      { v:'SERVICE', l:'🔧 Serviço Automotivo' },
    ];

    const placeholders = {
      SALE:    'Ex: Honda Civic 2022 impecável, único dono...',
      PART:    'Ex: Pastilha de freio Bosch para Civic 2020-2022...',
      SERVICE: 'Ex: Revisão completa com troca de óleo, filtros e correias...',
      RENT:    'Ex: Toyota Corolla disponível por diária ou mensal...',
    };

    const curType = editData?.type || preType;

    modals.innerHTML = `
      <div style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.75);
        backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center"
        id="createModal">
        <div style="background:var(--s2);border:1px solid var(--border2);border-radius:16px;
          padding:32px;width:100%;max-width:520px;max-height:85vh;overflow-y:auto;position:relative">
          <button onclick="document.getElementById('createModal').remove()" style="
            position:absolute;top:16px;right:16px;background:none;border:none;
            color:var(--muted);font-size:1.2rem;cursor:pointer">✕</button>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:3px;margin-bottom:20px">
            ${isEdit ? 'EDITAR ANÚNCIO' : 'PUBLICAR ANÚNCIO'}</div>
          ${isEdit && editData.status === 'ACTIVE' ? `
            <div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:#f59e0b;
              font-size:.74rem;border-radius:8px;padding:10px 12px;margin-bottom:16px">
              ⚠️ Este anúncio já está ativo. Ao salvar, ele volta para análise antes de reaparecer na busca.
            </div>`:''}

          <div style="margin-bottom:14px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">TIPO DE ANÚNCIO *</label>
            <select id="clTypeNew" onchange="Pages._updateListingPlaceholder()"
              style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
              ${typeOptions.map(t => `<option value="${t.v}" ${t.v === curType ? 'selected' : ''}>${t.l}</option>`).join('')}
            </select>
          </div>

          ${[
            ['clTitle','Título *','text','', editData?.title||''],
            ['clPrice','Preço (R$) — deixe 0 para "Consultar"','number','0', editData?.price ?? ''],
            ['clCityNew','Cidade *','text','Ex: São Paulo', editData?.city||''],
          ].map(([id, lbl, type, ph, val]) => `
            <div style="margin-bottom:12px">
              <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                letter-spacing:1px;display:block;margin-bottom:5px">${lbl.toUpperCase()}</label>
              <input id="${id}" type="${type}" placeholder="${ph}" value="${escHtml(String(val))}" style="
                width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
            </div>`).join('')}
          <div style="margin-bottom:12px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">ESTADO *</label>
            <select id="clState" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
              <option value="">— Selecione —</option>
              ${'AC,AL,AP,AM,BA,CE,DF,ES,GO,MA,MT,MS,MG,PA,PB,PR,PE,PI,RJ,RN,RS,RO,RR,SC,SP,SE,TO'.split(',').map(uf=>`<option value="${uf}" ${editData?.state===uf?'selected':''}>${uf}</option>`).join('')}
            </select>
          </div>

          <div style="margin-bottom:18px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">DESCRIÇÃO *</label>
            <textarea id="clDesc" rows="4"
              placeholder="${placeholders[curType]}"
              style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;resize:vertical">${escHtml(editData?.description||'')}</textarea>
          </div>

          <div style="margin-bottom:18px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:1px;display:block;margin-bottom:5px">
              📷 GALERIA DE FOTOS (ATÉ ${LISTING_MAX_PHOTOS}) <span style="color:var(--q4)">— a primeira é a capa</span>
            </label>
            <div class="lg-up-grid" id="clPhotoPreview"></div>
          </div>
          <button id="clSubmitBtn" onclick="Pages.submitListing()" style="
            width:100%;background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
            padding:12px;border-radius:8px;font-weight:700;font-size:.88rem;
            border:none;cursor:pointer;box-shadow:0 0 20px rgba(124,58,237,.4)">
            ${isEdit ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR ANÚNCIO'}
          </button>
        </div>
      </div>`;

    // Inicia o placeholder correto e a galeria de upload
    window._listingPhotos = isEdit ? parseImages(editData.images) : [];
    setTimeout(() => { Pages._updateListingPlaceholder(); Pages._renderPhotoGrid(); }, 50);
  };

  // Helper para atualizar placeholder da descrição ao trocar tipo
  function _updateListingPlaceholder() {
    const type = document.getElementById('clTypeNew')?.value || 'SALE';
    const titleInput = document.getElementById('clTitle');
    const descInput  = document.getElementById('clDesc');
    const phs = {
      SALE:    { title: 'Ex: Honda Civic 2022 — único dono', desc: 'Descreva o veículo: ano, km, estado, opcionais...' },
      PART:    { title: 'Ex: Pastilha Freio Bosch Civic 2020-2022', desc: 'Especifique: marca, compatibilidade, estado (nova/usada/recondicionada), quantidade...' },
      SERVICE: { title: 'Ex: Revisão Completa com Troca de Óleo', desc: 'Descreva o serviço: o que inclui, tempo estimado, garantia, disponibilidade...' },
      RENT:    { title: 'Ex: Toyota Corolla disponível p/ locação', desc: 'Descreva: modelo, ano, diária, mensal, condições, km incluso...' },
    };
    if (titleInput && phs[type]) titleInput.placeholder = phs[type].title;
    if (descInput  && phs[type]) descInput.placeholder  = phs[type].desc;
  };

  async function renderGaragem(...args) {
    if (window.Garagem?.render) return window.Garagem.render(...args);
    return '<div style="padding:40px;text-align:center;color:var(--muted)">Garagem indisponível.</div>';
  }
  window._renderGaragem = renderGaragem;


  async function _rentPreview(listingId) {
    const s = document.getElementById('rentStart')?.value;
    const e = document.getElementById('rentEnd')?.value;
    const box  = document.getElementById('rentPreview');
    if (!s || !e || !box) return;
    if (new Date(e) <= new Date(s)) {
      box.style.display='block';
      box.innerHTML='<span style="color:var(--red)">⚠ Devolução deve ser após retirada</span>';
      return;
    }
    box.style.display='block'; box.textContent='⟳ Calculando...';
    try {
      let cfgId = window.__rentCfgId;
      if (!cfgId) {
        const cfgRes = await API.rental.getConfigByListing(listingId);
        cfgId = cfgRes?.data?.id;
        window.__rentCfgId = cfgId;
      }
      if (!cfgId) { box.textContent='Config não encontrada.'; return; }
      const prev = await API.rental.previewPrice({ configId:cfgId, startDate:s, endDate:e });
      const d = prev?.data;
      if (!d) { box.textContent='Erro ao calcular.'; return; }
      const fmt = v=>`R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
      box.innerHTML=`<div>DIÁRIAS: ${d.days||'?'}</div>${d.deposit?`<div>Depósito: ${fmt(d.deposit)}</div>`:''
        }${d.renterTotal?`<div style="color:var(--neon);font-weight:700">TOTAL: ${fmt(d.renterTotal)}</div>`:''}`;
    } catch(err) { box.textContent=err?.message||'Erro.'; }
  }
  window._rentPreview = _rentPreview;
  
  async function _rentBook(listingId) {
    if (!API.isAuth()) { window.App?.toast('Faça login para reservar.','warn'); window.MobyaAuth?.showLogin(); return; }
    const s=document.getElementById('rentStart')?.value;
    const e=document.getElementById('rentEnd')?.value;
    const btn=document.getElementById('rentBtn');
    if (!s||!e) { window.App?.toast('Selecione as datas.','warn'); return; }
    if (new Date(e)<=new Date(s)) { window.App?.toast('Devolução deve ser após retirada.','warn'); return; }
    if (!window.__rentCfgId) {
      try { const r=await API.rental.getConfigByListing(listingId); window.__rentCfgId=r?.data?.id; } catch {}
    }
    if (!window.__rentCfgId) { window.App?.toast('Config não encontrada.','err'); return; }
    if (btn) { btn.disabled=true; btn.textContent='⟳ Criando reserva...'; }
    try {
      await API.rental.createBooking({ configId:window.__rentCfgId, startDate:s, endDate:e });
      window.App?.toast('✅ Reserva criada! Aguarde confirmação.','ok',5000);
      window.App?.navigate('minhas-reservas');
    } catch(err) {
      window.App?.toast(err?.message||'Erro ao reservar.','err');
      if (btn) { btn.disabled=false; btn.textContent='🗝️ Reservar Agora'; }
    }
  }
  window._rentBook = _rentBook;

  return {
    renderHome,
    renderClassificados,
    renderListing,
    renderAgentes,
    renderEmergencia,
    renderGaragem,
    renderCalculadoras,
    renderVistoria,
    renderDocumentacao,
    renderDashboard,
    showCreateListing,
    submitListing,
    editListing,
    pauseListing,
    reactivateListing,
    deleteListing,
    _renderPhotoGrid: function() {
      const photos = window._listingPhotos || [];
      const prev = document.getElementById('clPhotoPreview');
      if (!prev) return;
      const items = photos.map((u,i) => `
        <div class="lg-up-item">
          <img src="${u}" loading="lazy">
          ${i===0?'<span class="lg-up-cover">⭐ CAPA</span>':''}
          <button class="lg-up-del" onclick="Pages._removeListingPhoto(${i})" title="Remover">✕</button>
          <div class="lg-up-move">
            ${i>0?`<button onclick="Pages._moveListingPhoto(${i},-1)" title="Mover p/ esquerda">‹</button>`:'<span></span>'}
            ${i<photos.length-1?`<button onclick="Pages._moveListingPhoto(${i},1)" title="Mover p/ direita">›</button>`:'<span></span>'}
          </div>
        </div>`).join('');
      const addBtn = photos.length < LISTING_MAX_PHOTOS
        ? `<button type="button" class="lg-up-add" onclick="Pages._addListingPhotos()">
             <span style="font-size:1.3rem;line-height:1">＋</span><span>${photos.length}/${LISTING_MAX_PHOTOS}</span>
           </button>`
        : '';
      prev.innerHTML = items + addBtn;
    },
    _addListingPhotos: async function() {
      window._listingPhotos = window._listingPhotos || [];
      if (window._listingPhotos.length >= LISTING_MAX_PHOTOS) { App.toast(`Máximo ${LISTING_MAX_PHOTOS} fotos.`,'warn'); return; }
      try {
        const available = LISTING_MAX_PHOTOS - window._listingPhotos.length;
        const urls = await _pickListingPhoto(available);
        window._listingPhotos = window._listingPhotos.concat(urls.slice(0, available));
        Pages._renderPhotoGrid();
        if (urls.length) App.toast(window._listingPhotos.length + ' foto(s) na galeria.','ok');
      } catch(e) { App.toast(e.message||'Erro.','err'); }
    },
    _removeListingPhoto: function(i) {
      window._listingPhotos = (window._listingPhotos||[]).filter((_,idx)=>idx!==i);
      Pages._renderPhotoGrid();
    },
    _moveListingPhoto: function(i, dir) {
      const arr = window._listingPhotos || [];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      window._listingPhotos = arr;
      Pages._renderPhotoGrid();
    },
    searchListings,
    showCalcTab,
    openSOS,
    runVistoria,
    renderPecas,
    renderServicos,
    searchPecas,
    searchServicos,
    listingCard,
    cotarPeca,
    solicitarPeca,
    _updateListingPlaceholder,
  };

})();

