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
  // HOME — Painel Quântico
  // ═══════════════════════════════════════════════════════════
  async function renderHome() {
    const el = main();
    if (!el) return;

    el.innerHTML = `
      <!-- HERO -->
      <div style="position:relative;margin-bottom:36px;overflow:hidden;border-radius:16px;
        background:linear-gradient(135deg,rgba(91,33,182,.18) 0%,rgba(0,245,255,.06) 100%);
        border:1px solid var(--border2);padding:40px 36px">
        <div style="position:absolute;inset:0;pointer-events:none;overflow:hidden">
          ${Array(12).fill(0).map((_,i)=>`
            <div style="position:absolute;width:${60+i*20}px;height:1px;
              background:linear-gradient(90deg,transparent,rgba(0,245,255,.15),transparent);
              top:${8+i*8}%;left:0;right:0;animation:scanLine ${3+i*.4}s linear infinite;
              opacity:.6"></div>`).join('')}
        </div>
        <div style="position:relative;z-index:1;max-width:700px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:3px;
            color:var(--neon);margin-bottom:12px">⬡ QUANTUM ENGINE v3.0 · 9 AGENTES NEXUS ATIVOS</div>
          <h1 style="font-family:'Bebas Neue',sans-serif;font-size:3.2rem;letter-spacing:5px;
            line-height:.95;background:linear-gradient(135deg,#fff 40%,var(--q4),var(--neon));
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">
            INTELIGÊNCIA<br>AUTOMOTIVA<br>QUÂNTICA
          </h1>
          <p style="color:var(--muted);font-size:.9rem;line-height:1.6;margin-bottom:24px;max-width:500px">
            O ecossistema mais avançado para compra, venda, manutenção, seguro e logística
            automotiva do Brasil. Powered by IA multi-agente com fallback quântico.
          </p>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button onclick="renderPage('agentes')" style="
              background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
              padding:12px 26px;border-radius:8px;font-weight:700;font-size:.88rem;
              border:none;cursor:pointer;box-shadow:0 0 24px rgba(124,58,237,.4)">
              🤖 CONSULTAR IA
            </button>
            <button onclick="renderPage('classificados')" style="
              background:rgba(0,245,255,.08);color:var(--neon);
              border:1px solid rgba(0,245,255,.25);padding:12px 26px;border-radius:8px;
              font-weight:600;font-size:.88rem;cursor:pointer">
              🚘 VER CLASSIFICADOS
            </button>
            <button onclick="renderPage('emergencia')" style="
              background:rgba(244,63,94,.1);color:var(--red);
              border:1px solid rgba(244,63,94,.3);padding:12px 26px;border-radius:8px;
              font-weight:600;font-size:.88rem;cursor:pointer">
              🚨 SOS EMERGÊNCIA
            </button>
          </div>
        </div>
      </div>

      <!-- QUICK ACCESS GRID -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:32px" id="quickGrid">
        ${[
          { page:'classificados', icon:'🚘', label:'Classificados',  color:'var(--q4)',  bg:'rgba(124,58,237,.1)' },
          { page:'agentes',       icon:'🤖', label:'Agentes IA',     color:'var(--neon)',bg:'rgba(0,245,255,.07)' },
          { page:'emergencia',    icon:'🚨', label:'SOS 24H',        color:'var(--red)', bg:'rgba(244,63,94,.1)'  },
          { page:'calculadoras',  icon:'🧮', label:'Calculadoras',   color:'var(--gold)',bg:'rgba(251,191,36,.08)'},
          { page:'monetizacao',   icon:'💰', label:'Parceiros',      color:'var(--green)',bg:'rgba(16,185,129,.08)'},
          { page:'seguros-sim',   icon:'🛡️', label:'Seguros IA',     color:'var(--green)',bg:'rgba(16,185,129,.08)'},
          { page:'fretes',        icon:'🚛', label:'Fretes',         color:'var(--gold)',bg:'rgba(251,191,36,.08)'},
          { page:'vistoria',      icon:'🔍', label:'Vistoria',       color:'var(--q4)', bg:'rgba(124,58,237,.1)' },
        ].map(q=>`
          <div onclick="renderPage('${q.page}')" style="
            background:${q.bg};border:1px solid rgba(255,255,255,.06);border-radius:10px;
            padding:18px 14px;cursor:pointer;text-align:center;transition:all .18s"
            onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='rgba(255,255,255,.15)'"
            onmouseout="this.style.transform='translateY(0)';this.style.borderColor='rgba(255,255,255,.06)'">
            <div style="font-size:1.6rem;margin-bottom:8px">${q.icon}</div>
            <div style="font-size:.78rem;font-weight:600;color:${q.color}">${q.label}</div>
          </div>`).join('')}
      </div>

      <!-- STATS + ÚLTIMOS CLASSIFICADOS -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:20px;align-items:start">
        <!-- Últimos anúncios -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:2px;color:var(--q4)">
              ⬡ MELHORES OFERTAS</div>
            <button onclick="renderPage('classificados')" style="background:none;color:var(--muted);
              font-size:.75rem;border:none;cursor:pointer">Ver todos →</button>
          </div>
          <div id="homeListings" style="display:grid;gap:10px">${skeleton(3)}</div>
        </div>

        <!-- Painel lateral -->
        <div style="display:flex;flex-direction:column;gap:14px">
          <!-- NEXUS STATUS -->
          ${card(`
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
              color:var(--q4);margin-bottom:14px">⬡ STATUS NEXUS</div>
            <div id="homProviders" style="display:flex;flex-direction:column;gap:8px">
              ${['SambaNova','Cerebras','Gemini','OpenRouter'].map(p=>`
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:.78rem;color:var(--muted)">${p}</span>
                  <span id="hp_${p.toLowerCase().replace(' ','')}" style="font-family:'JetBrains Mono',monospace;
                    font-size:.65rem;color:var(--muted)">●  –</span>
                </div>`).join('')}
            </div>
          `)}

          <!-- DESTAQUE MONETIZAÇÃO -->
          ${card(`
            <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;
              color:var(--green);margin-bottom:10px">💰 GANHE COM MOBYA</div>
            <div style="font-size:.82rem;color:var(--text);margin-bottom:12px;line-height:1.5">
              Integre sua oficina, locadora ou seguradora e receba leads qualificados.
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
              ${[['🔧 Serviços','10%'],['🗝️ Locação','5%'],['🚛 Fretes','10%'],['🛡️ Seguros','até 8%']].map(
                ([l,r])=>`<div style="display:flex;justify-content:space-between;font-size:.76rem">
                  <span style="color:var(--muted)">${l}</span>
                  <span style="color:var(--green);font-family:'JetBrains Mono',monospace">${r}</span>
                </div>`).join('')}
            </div>
            <button onclick="Monetization.showRegisterPartner()" style="
              width:100%;background:rgba(16,185,129,.12);color:var(--green);
              border:1px solid rgba(16,185,129,.25);padding:9px;border-radius:8px;
              font-weight:600;font-size:.8rem;cursor:pointer">
              Cadastrar meu negócio →
            </button>
          `, { border:'rgba(16,185,129,.2)' })}
        </div>
      </div>
    `;

    // Carrega ofertas e providers em paralelo
    Promise.all([
      API.listings.search({ limit: 6, sort: 'recent' }).catch(() => null),
      API.ai.providers().catch(() => null),
    ]).then(([listR, provR]) => {
      // Listings
      const listings = listR?.data || [];
      const homeEl   = document.getElementById('homeListings');
      if (homeEl) {
        if (!listings.length) {
          homeEl.innerHTML = `<div style="color:var(--muted);font-size:.8rem;padding:24px;text-align:center">
            Nenhum anúncio disponível. <button onclick="renderPage('classificados')" style="
              background:none;color:var(--q4);border:none;cursor:pointer;font-weight:600">
              Seja o primeiro!</button></div>`;
        } else {
          homeEl.innerHTML = listings.map(l => listingMiniCard(l)).join('');
        }
      }
      // Providers
      const providers = provR?.data || [];
      providers.forEach(p => {
        const el = document.getElementById(`hp_${p.name.toLowerCase()}`);
        if (el) {
          el.style.color = p.configured ? 'var(--green)' : 'var(--muted)';
          el.textContent = p.configured ? '● ATIVO' : '● OFF';
        }
      });
    });
  }

  function listingMiniCard(l) {
    const imgs = (() => { try { return JSON.parse(l.images||'[]'); } catch { return []; } })();
    return `
      <div onclick="renderPage('listing-${l.id}')" style="
        background:var(--s2);border:1px solid var(--border);border-radius:10px;
        padding:14px;display:flex;gap:12px;cursor:pointer;transition:all .15s"
        onmouseover="this.style.borderColor='var(--border2)'"
        onmouseout="this.style.borderColor='var(--border)'">
        <div style="width:72px;height:54px;border-radius:7px;overflow:hidden;flex-shrink:0;
          background:var(--s3);display:flex;align-items:center;justify-content:center">
          ${imgs[0]
            ? `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover">`
            : `<span style="font-size:1.6rem">🚗</span>`}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.84rem;white-space:nowrap;overflow:hidden;
            text-overflow:ellipsis">${escHtml(l.title)}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--q4);margin:2px 0">
            ${fmtBRL(l.price)}</div>
          <div style="font-size:.7rem;color:var(--muted)">${l.city}/${l.state} · ${ago(l.createdAt)}</div>
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

    Pages.searchListings();
  }

  let clPage = 1;

  Pages.searchListings = async function(page=1) {
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
    const imgs = (() => { try { return JSON.parse(l.images||'[]'); } catch { return []; } })();
    const typeColors = { SALE:'var(--q4)', RENT:'var(--neon)', PART:'var(--gold)',
                         SERVICE:'var(--green)', INSURANCE:'var(--green)', FINANCING:'var(--orange)' };
    const typeLabels = { SALE:'Venda', RENT:'Aluguel', PART:'Peça', SERVICE:'Serviço',
                         INSURANCE:'Seguro', FINANCING:'Financiamento' };
    return `
      <div onclick="renderPage('listing-${l.id}')" style="
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

  Pages.showCreateListing = function() {
    if (!API.isAuth()) { window.MobyaAuth?.showLogin(); return; }
    const modals = document.getElementById('modals');
    if (!modals) return;
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
            PUBLICAR ANÚNCIO</div>
          ${[
            ['clTitle','Título *','text','Ex: Honda Civic 2022 — impecável'],
            ['clPrice','Preço (R$) *','number','Ex: 95000'],
            ['clCity','Cidade *','text','Ex: São Paulo'],
            ['clState','Estado *','text','SP'],
          ].map(([id,lbl,type,ph])=>`
            <div style="margin-bottom:12px">
              <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
                letter-spacing:1px;display:block;margin-bottom:5px">${lbl.toUpperCase()}</label>
              <input id="${id}" type="${type}" placeholder="${ph}" style="
                width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
                padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
            </div>`).join('')}
          <div style="margin-bottom:12px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">TIPO *</label>
            <select id="clTypeNew" style="width:100%;background:var(--s3);border:1px solid var(--border);
              color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
              <option value="SALE">🚗 Venda</option><option value="RENT">🗝️ Aluguel</option>
              <option value="PART">⚙️ Peça</option><option value="SERVICE">🔧 Serviço</option>
            </select>
          </div>
          <div style="margin-bottom:18px">
            <label style="font-size:.72rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
              letter-spacing:1px;display:block;margin-bottom:5px">DESCRIÇÃO *</label>
            <textarea id="clDesc" rows="3" placeholder="Descreva o veículo, peça ou serviço..." style="
              width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none;resize:vertical"></textarea>
          </div>
          <button id="clSubmitBtn" onclick="Pages.submitListing()" style="
            width:100%;background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
            padding:12px;border-radius:8px;font-weight:700;font-size:.88rem;
            border:none;cursor:pointer;box-shadow:0 0 20px rgba(124,58,237,.4)">
            PUBLICAR ANÚNCIO
          </button>
        </div>
      </div>`;
  };

  Pages.submitListing = async function() {
    const btn   = document.getElementById('clSubmitBtn');
    const title = document.getElementById('clTitle')?.value?.trim();
    const price = document.getElementById('clPrice')?.value;
    const city  = document.getElementById('clCity')?.value?.trim();
    const state = document.getElementById('clState')?.value?.trim().toUpperCase();
    const desc  = document.getElementById('clDesc')?.value?.trim();
    const type  = document.getElementById('clTypeNew')?.value || 'SALE';

    if (!title||!price||!city||!state||!desc) {
      App.toast('Preencha todos os campos obrigatórios.','warn'); return;
    }
    if (btn) { btn.disabled=true; btn.style.opacity='.5'; }
    try {
      await API.listings.create({ title, price:parseFloat(price), city, state, description:desc, type });
      document.getElementById('createModal')?.remove();
      App.toast('✅ Anúncio publicado com sucesso!','ok');
      Pages.searchListings();
    } catch(e) {
      App.toast(e.message||'Erro ao publicar.','err');
    } finally {
      if (btn) { btn.disabled=false; btn.style.opacity='1'; }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // DETALHE DO ANÚNCIO
  // ═══════════════════════════════════════════════════════════
  async function renderListing(id) {
    const el = main();
    if (!el) return;
    el.innerHTML = `<button onclick="renderPage('classificados')" style="
      background:none;border:none;color:var(--muted);cursor:pointer;font-size:.82rem;margin-bottom:20px">
      ← Voltar aos classificados</button>${skeleton(2)}`;

    try {
      const r = await API.listings.get(id);
      const l = r.data;
      const imgs = (() => { try { return JSON.parse(l.images||'[]'); } catch { return []; } })();

      el.innerHTML = `
        <button onclick="renderPage('classificados')" style="
          background:none;border:none;color:var(--muted);cursor:pointer;font-size:.82rem;margin-bottom:20px">
          ← Voltar aos classificados</button>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:24px;align-items:start">
          <div>
            <!-- Imagens -->
            <div style="border-radius:12px;overflow:hidden;background:var(--s3);
              height:320px;margin-bottom:16px;display:flex;align-items:center;justify-content:center">
              ${imgs[0]?`<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover">`
                       :`<span style="font-size:4rem">🚗</span>`}
            </div>
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
            ${card(`
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
              <button onclick="renderPage('agentes')" style="
                width:100%;background:rgba(124,58,237,.12);color:var(--q4);
                border:1px solid rgba(124,58,237,.25);padding:10px;border-radius:8px;
                font-weight:600;font-size:.82rem;cursor:pointer">
                🤖 Analisar com IA
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
    } catch(e) {
      el.innerHTML = `<div style="color:var(--red);padding:32px">⚠️ ${e.message}</div>`;
    }
  }

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

  Pages.openSOS = async function(type, label) {
    if (!API.isAuth()) {
      App.toast('Faça login para registrar emergência.','warn');
      window.MobyaAuth?.showLogin(); return;
    }
    const desc = prompt(`🚨 ${label}\n\nDescreva brevemente a situação e sua localização:`);
    if (!desc) return;
    try {
      await API.emergency.create({ type, description: desc });
      App.toast(`🚨 Emergência ${label} registrada! Aguarde contato.`,'ok');
      if (typeof Chat !== 'undefined') Chat.inject(`Tive ${label.toLowerCase()}. ${desc}`);
    } catch(e) {
      App.toast(e.message||'Erro ao registrar.','err');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // CALCULADORAS
  // ═══════════════════════════════════════════════════════════
  function renderCalculadoras() {
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
        <div style="display:grid;grid-template-columns:340px 1fr;gap:20px">
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
        <div style="display:grid;grid-template-columns:340px 1fr;gap:20px">
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
        <div style="display:grid;grid-template-columns:340px 1fr;gap:20px">
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

  Pages.showCalcTab = function(tab) {
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
      <div style="display:grid;grid-template-columns:380px 1fr;gap:24px;align-items:start">
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

  Pages.runVistoria = async function() {
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
            <button onclick="renderPage('agentes');setTimeout(()=>Chat.selectAgent('${d.agent}',document.querySelector('.achip')),200)" style="
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
    el.innerHTML = `${pageHeader('MEU DASHBOARD','Seus anúncios · Emergências · Cotações','var(--q4),var(--neon)')}
      <div id="dashContent">${skeleton(4)}</div>`;

    try {
      const [listingsR, quotesR] = await Promise.all([
        API.listings.mine({ limit: 10 }).catch(() => null),
        API.monetization?.quotesMine('?limit=5').catch(() => null),
      ]);
      const listings = listingsR?.data || [];
      const quotes   = quotesR?.data?.quotes || quotesR?.data || [];

      document.getElementById('dashContent').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px">
          ${[
            {label:'MEUS ANÚNCIOS',  value:fmtNum(listingsR?.pagination?.total||listings.length), color:'var(--q4)'},
            {label:'MINHAS COTAÇÕES',value:fmtNum(quotesR?.pagination?.total||quotes.length),      color:'var(--green)'},
            {label:'STATUS',         value:'ATIVO',                                                color:'var(--neon)'},
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
              ? listings.map(l=>listingMiniCard(l)).join('')
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
              ? quotes.map(q=>`
                <div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;
                  padding:12px;margin-bottom:8px;font-size:.8rem">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-weight:600">${q.vertical}</span>
                    <span style="font-family:'JetBrains Mono',monospace;font-size:.68rem;
                      color:${q.status==='COMPLETED'?'var(--green)':q.status==='ACCEPTED'?'var(--gold)':'var(--muted)'}">${q.status}</span>
                  </div>
                  <div style="color:var(--muted);font-size:.76rem">${escHtml((q.description||'').slice(0,60))}…</div>
                </div>`).join('')
              : `<div style="color:var(--muted);font-size:.8rem;padding:24px;text-align:center">
                  Nenhuma cotação ainda. <button onclick="renderPage('monetizacao')" style="background:none;
                    color:var(--green);border:none;cursor:pointer;font-weight:600">Solicitar agora</button></div>`}
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
  return {
    renderHome,
    renderClassificados,
    renderListing,
    renderAgentes,
    renderEmergencia,
    renderCalculadoras,
    renderVistoria,
    renderDocumentacao,
    renderDashboard,
    showCreateListing:   () => {},  // será sobrescrito pelo closure
    submitListing:       () => {},
    searchListings:      () => {},
    showCalcTab:         () => {},
    openSOS:             () => {},
    runVistoria:         () => {},
  };

})();
