// js/central.js
// ============================================================
// CENTRAL MOBYA — dashboard unificado por capacidades.
//
// Problema que resolve: o usuário Mobya é UMA identidade só, mas o app
// tinha ~7 painéis desconexos tratando cada capacidade (anfitrião,
// locatário, prestador/parceiro, comprador) como se fosse uma "conta"
// diferente. Aqui não criamos telas novas do zero — cada módulo
// (RentalHost, RentalGuest, Monetization, WalletPage, PainelComprador)
// continua com sua lógica intacta. O que muda é que agora todos
// compartilham a MESMA barra de navegação entre capacidades no topo,
// então o usuário nunca perde a noção de que está tudo dentro de uma
// única conta — só mudou de aba.
// ============================================================
window.Central = (() => {
  // Fonte única de verdade sobre "o que essa conta já usa" — vem do
  // endpoint agregador GET /me/overview (backend). Cacheado em memória
  // por navegação; renderOverview() sempre revalida.
  let _cache = null;

  async function _load(force = false) {
    if (_cache && !force) return _cache;
    try {
      const r = await API.me.overview();
      _cache = r?.data || null;
    } catch (e) {
      _cache = null;
    }
    return _cache;
  }

  // Abas fixas de navegação entre capacidades. Todas ficam sempre visíveis
  // (mesmo a que o usuário ainda não usa) porque também funcionam como
  // descoberta: "Prestador" leva a quem nunca foi parceiro para o cadastro.
  const TABS = [
    { key: 'overview',  label: 'Visão Geral',      icon: '⬡',  route: 'dashboard' },
    { key: 'anuncios',  label: 'Anúncios',         icon: '📦', route: 'dashboard' },
    { key: 'anfitriao', label: 'Anfitrião',        icon: '🗝️', route: 'painel-anfitriao' },
    { key: 'locatario', label: 'Minhas Reservas',  icon: '📋', route: 'painel-comprador' },
    { key: 'prestador', label: 'Prestador',        icon: '🛠️', route: 'painel-prestador' },
    { key: 'carteira',  label: 'Carteira',         icon: '💳', route: 'carteira' },
  ];

  function tabBar(activeKey) {
    return `<div style="display:flex;gap:4px;margin-bottom:22px;padding-bottom:2px;
        border-bottom:1px solid var(--border);overflow-x:auto;-webkit-overflow-scrolling:touch">
      ${TABS.map(t => `
        <button onclick="App.navigate('${t.route}')" style="
          flex:0 0 auto;display:flex;align-items:center;gap:6px;white-space:nowrap;
          font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.76rem;
          padding:9px 14px;border:none;cursor:pointer;border-radius:8px 8px 0 0;
          transition:all .15s;
          background:${t.key===activeKey ? 'var(--s2)' : 'transparent'};
          color:${t.key===activeKey ? 'var(--neon)' : 'var(--muted)'};
          border-bottom:${t.key===activeKey ? '2px solid var(--neon)' : '2px solid transparent'}">
          <span>${t.icon}</span><span>${t.label}</span>
        </button>`).join('')}
    </div>`;
  }

  function _card(label, value, color) {
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
      padding:18px;text-align:center">
      <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);
        margin-bottom:8px">${label}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:${color}">${value}</div>
    </div>`;
  }

  // CTA de descoberta para uma capacidade ainda não ativada — em vez de
  // simplesmente esconder o módulo (o que reforçaria a sensação de "conta
  // separada"), mostramos o caminho pra ativá-lo dentro da mesma conta.
  function _ctaCard(icon, title, desc, route, ctaLabel) {
    return `<div style="background:var(--s2);border:1px dashed var(--border2);border-radius:10px;
      padding:20px;text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center">
      <div style="font-size:1.8rem">${icon}</div>
      <div style="font-weight:700;font-size:.86rem">${title}</div>
      <div style="color:var(--muted);font-size:.76rem">${desc}</div>
      <button onclick="App.navigate('${route}')" style="margin-top:6px;background:none;
        border:1px solid var(--border2);color:var(--neon);border-radius:7px;padding:7px 16px;
        cursor:pointer;font-weight:600;font-size:.76rem;font-family:'Space Grotesk',sans-serif">
        ${ctaLabel} →
      </button>
    </div>`;
  }

  function _escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  async function renderOverview() {
    const el = document.getElementById('main');
    if (!el) return;
    if (!API.isAuth()) {
      el.innerHTML = `<div style="text-align:center;padding:64px">
        <div style="font-size:3rem;margin-bottom:16px">🔒</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--muted)">ACESSO RESTRITO</div>
        <div style="font-size:.84rem;color:var(--muted);margin:12px 0 24px">Faça login para ver sua Central Mobya.</div>
        <button onclick="window.MobyaAuth?.showLogin()" style="background:linear-gradient(135deg,var(--q1),var(--q3));
          color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;border:none;cursor:pointer">ENTRAR</button>
      </div>`;
      return;
    }

    el.innerHTML = `<div style="margin-bottom:20px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;
          background:linear-gradient(135deg,#fff,var(--q3),var(--neon));-webkit-background-clip:text;
          -webkit-text-fill-color:transparent">CENTRAL MOBYA</div>
        <div style="color:var(--muted);font-size:.84rem;margin-top:4px">
          Uma conta só — anúncios, aluguel, serviços e carteira, tudo aqui.
        </div>
      </div>
      ${tabBar('overview')}
      <div id="central-content"><div style="color:var(--muted);font-family:'JetBrains Mono',monospace;
        font-size:.73rem;text-align:center;padding:40px">⟳ Carregando...</div></div>`;

    const data = await _load(true);
    const content = document.getElementById('central-content');
    if (!content) return;
    if (!data) {
      content.innerHTML = `<div style="color:var(--red);padding:32px;text-align:center">
        ⚠️ Não foi possível carregar sua Central agora.
        <button onclick="Central.renderOverview()" style="display:block;margin:14px auto 0;
          background:var(--s2);border:1px solid var(--border);color:var(--neon);border-radius:8px;
          padding:8px 18px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:.72rem">
          ↺ Tentar novamente</button></div>`;
      return;
    }

    const { modules, counters, anuncios, anfitriao, locatario, prestador, cotacoes } = data;

    content.innerHTML = `
      <div id="push-opt-in-banner"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:26px">
        ${_card('MEUS ANÚNCIOS', counters.anuncios, 'var(--q4)')}
        ${_card('RESERVAS PENDENTES', counters.reservasRecebidasPendentes, counters.reservasRecebidasPendentes ? 'var(--gold)' : 'var(--neon)')}
        ${_card('MINHAS COTAÇÕES', counters.cotacoes, 'var(--green)')}
        ${_card('EMERGÊNCIAS ATIVAS', counters.emergenciasAtivas, counters.emergenciasAtivas ? 'var(--red)' : 'var(--neon)')}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
        ${modules.anuncios ? `
          <div onclick="App.navigate('dashboard')" style="background:var(--s2);border:1px solid var(--border);
            border-radius:10px;padding:18px;cursor:pointer">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:1px;
              color:var(--q4);margin-bottom:10px">📦 MEUS ANÚNCIOS</div>
            ${anuncios.length
              ? anuncios.slice(0,3).map(l => `<div style="font-size:.8rem;padding:6px 0;border-top:1px solid var(--border)">
                  ${_escHtml(l.title)} <span style="color:var(--muted);font-size:.7rem">· ${l.status}</span></div>`).join('')
              : `<div style="color:var(--muted);font-size:.78rem">Nenhum anúncio ativo.</div>`}
          </div>`
          : _ctaCard('📦', 'Venda ou anuncie um veículo', 'Publique seu primeiro anúncio no classificados.', 'classificados', 'Publicar anúncio')}

        ${modules.anfitriao ? `
          <div onclick="App.navigate('painel-anfitriao')" style="background:var(--s2);border:1px solid var(--border);
            border-radius:10px;padding:18px;cursor:pointer">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:1px;
              color:var(--gold);margin-bottom:10px">🗝️ COMO ANFITRIÃO</div>
            ${anfitriao.bookings.length
              ? anfitriao.bookings.slice(0,3).map(b => `<div style="font-size:.8rem;padding:6px 0;border-top:1px solid var(--border)">
                  ${_escHtml(b.config?.listing?.title || 'Reserva')} <span style="color:var(--muted);font-size:.7rem">· ${b.status}</span></div>`).join('')
              : `<div style="color:var(--muted);font-size:.78rem">Nenhuma reserva recebida ainda.</div>`}
          </div>`
          : _ctaCard('🗝️', 'Coloque seu carro pra alugar', 'Vire anfitrião e ganhe com seu veículo parado.', 'aluguel', 'Cadastrar veículo')}

        ${modules.locatario ? `
          <div onclick="App.navigate('painel-comprador')" style="background:var(--s2);border:1px solid var(--border);
            border-radius:10px;padding:18px;cursor:pointer">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:1px;
              color:var(--neon);margin-bottom:10px">📋 COMO LOCATÁRIO</div>
            ${locatario.bookings.length
              ? locatario.bookings.slice(0,3).map(b => `<div style="font-size:.8rem;padding:6px 0;border-top:1px solid var(--border)">
                  ${_escHtml(b.config?.listing?.title || 'Reserva')} <span style="color:var(--muted);font-size:.7rem">· ${b.status}</span></div>`).join('')
              : `<div style="color:var(--muted);font-size:.78rem">Nenhuma reserva feita ainda.</div>`}
          </div>`
          : _ctaCard('🚗', 'Alugue um veículo', 'Encontre carros disponíveis perto de você.', 'aluguel', 'Buscar veículos')}

        ${modules.prestador ? `
          <div onclick="App.navigate('painel-prestador')" style="background:var(--s2);border:1px solid var(--border);
            border-radius:10px;padding:18px;cursor:pointer">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:1px;
              color:var(--green);margin-bottom:10px">🛠️ COMO PRESTADOR</div>
            <div style="font-size:.8rem;padding:6px 0">${_escHtml(prestador.vertical)} · ${prestador.status}</div>
            <div style="font-size:.78rem;color:var(--muted)">Saldo: ${(prestador.walletBalance||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
          </div>`
          : _ctaCard('🛠️', 'Seja um parceiro Mobya', 'Ofereça reboque, chaveiro, mecânica e mais.', 'cadastro-parceiro', 'Quero ser parceiro')}

        ${modules.cotacoes ? `
          <div onclick="App.navigate('dashboard')" style="background:var(--s2);border:1px solid var(--border);
            border-radius:10px;padding:18px;cursor:pointer">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:1px;
              color:var(--q3);margin-bottom:10px">🧾 SERVIÇOS QUE CONTRATEI</div>
            ${cotacoes.slice(0,3).map(q => `<div style="font-size:.8rem;padding:6px 0;border-top:1px solid var(--border)">
                ${_escHtml(q.vertical)} <span style="color:var(--muted);font-size:.7rem">· ${q.status}</span></div>`).join('')}
          </div>`
          : _ctaCard('🧾', 'Contrate um serviço', 'Reboque, seguro, financiamento e mais num clique.', 'servicos', 'Ver serviços')}

        <div onclick="App.navigate('carteira')" style="background:var(--s2);border:1px solid var(--border);
          border-radius:10px;padding:18px;cursor:pointer">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:1px;
            color:var(--gold);margin-bottom:10px">💳 CARTEIRA</div>
          <div style="color:var(--muted);font-size:.78rem">Ver saldo, extrato e solicitar saque →</div>
        </div>
      </div>
    `;

    _renderPushBanner();
  }

  // Frente D do master prompt: banner discreto oferecendo ativar push,
  // so aparece se o navegador suporta E o usuario ainda nao esta inscrito.
  // Nunca pede permissao sozinho - so no clique explicito do usuario.
  async function _renderPushBanner() {
    const banner = document.getElementById('push-opt-in-banner');
    if (!banner || typeof PushClient === 'undefined' || !PushClient.isSupported()) return;
    const already = await PushClient.isSubscribed().catch(() => true);
    if (already) return;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
        background:rgba(0,245,255,.06);border:1px solid rgba(0,245,255,.2);border-radius:10px;
        padding:12px 16px;margin-bottom:20px">
        <div style="font-size:.8rem;color:var(--text)">
          🔔 Ative notificações e não perca mensagens, propostas e reservas.
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="Central.enablePush(this)" style="background:linear-gradient(135deg,var(--q1),var(--neon));
            color:#04040a;border:none;border-radius:7px;padding:8px 16px;font-weight:700;font-size:.76rem;cursor:pointer">
            Ativar
          </button>
          <button onclick="document.getElementById('push-opt-in-banner').innerHTML=''" style="background:none;
            border:1px solid var(--border);color:var(--muted);border-radius:7px;padding:8px 14px;
            font-size:.76rem;cursor:pointer">Agora não</button>
        </div>
      </div>`;
  }

  async function enablePush(btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Ativando...'; }
    const ok = await PushClient.subscribe().catch(() => false);
    const banner = document.getElementById('push-opt-in-banner');
    if (banner) {
      banner.innerHTML = ok
        ? `<div style="color:#10b981;font-size:.8rem;padding:10px 16px;background:rgba(16,185,129,.08);
            border:1px solid rgba(16,185,129,.2);border-radius:10px;margin-bottom:20px">✅ Notificações ativadas!</div>`
        : `<div style="color:var(--gold);font-size:.8rem;padding:10px 16px;background:rgba(245,158,11,.08);
            border:1px solid rgba(245,158,11,.2);border-radius:10px;margin-bottom:20px">⚠️ Não foi possível ativar — verifique a permissão de notificações do navegador.</div>`;
    }
  }

  return { tabBar, renderOverview, enablePush, invalidate: () => { _cache = null; } };
})();
