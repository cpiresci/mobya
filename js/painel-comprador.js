// ============================================================
// MOBYA — painel-comprador.js
// Painel do Comprador: agrega dados que já existem em endpoints
// separados (favoritos, reservas de aluguel, conversas). Não cria
// tabela nova nenhuma — só uma tela que junta tudo num lugar só.
// ============================================================
window.PainelComprador = (() => {
  let activeTab = 'favoritos';

  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function fmtBRL(v) { return (Number(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }

  const BOOKING_LABELS = {
    PENDING:'Aguardando anfitrião', CONFIRMED:'Confirmada', ACTIVE:'Em andamento',
    COMPLETED:'Concluída', DECLINED:'Recusada', CANCELLED:'Cancelada', DISPUTED:'Em disputa',
  };
  const BOOKING_COLORS = {
    PENDING:'var(--gold)', CONFIRMED:'var(--neon)', ACTIVE:'var(--green)',
    COMPLETED:'var(--muted)', DECLINED:'var(--red)', CANCELLED:'var(--red)', DISPUTED:'var(--orange)',
  };

  async function render(containerId = 'main') {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!API.isAuth()) { window.MobyaAuth?.showLogin('painel-comprador'); return; }

    const centralBar = (containerId === 'main' && typeof Central !== 'undefined') ? Central.tabBar('locatario') : '';
    el.innerHTML = `
      ${centralBar}
      <div style="margin-bottom:20px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;
          background:linear-gradient(135deg,#fff,var(--q3),var(--neon));-webkit-background-clip:text;
          -webkit-text-fill-color:transparent">PAINEL DO COMPRADOR</div>
        <div style="color:var(--muted);font-size:.84rem;margin-top:4px">Seus favoritos, reservas e conversas num só lugar</div>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:18px;border-bottom:1px solid var(--border)">
        ${tabBtn('favoritos','⭐ Favoritos')}
        ${tabBtn('reservas','📋 Reservas')}
        ${tabBtn('conversas','💬 Conversas')}
      </div>
      <div id="pcBody" style="min-height:200px"></div>`;

    renderTab(activeTab);
  }

  function tabBtn(id, label) {
    const on = activeTab === id;
    return `<div onclick="PainelComprador.tab('${id}')" style="padding:10px 16px;cursor:pointer;
      font-weight:600;font-size:.82rem;border-bottom:2px solid ${on?'var(--neon)':'transparent'};
      color:${on?'var(--text)':'var(--muted)'};transition:color .15s">${label}</div>`;
  }

  function tab(id) { activeTab = id; render(); }

  async function renderTab(id) {
    const body = document.getElementById('pcBody');
    if (!body) return;
    body.innerHTML = `<div style="color:var(--muted);text-align:center;padding:32px;font-family:'JetBrains Mono',monospace;font-size:.73rem">⟳ Carregando...</div>`;
    try {
      if (id === 'favoritos') return await renderFavoritos(body);
      if (id === 'reservas')  return await renderReservas(body);
      if (id === 'conversas') return renderConversas(body);
    } catch (e) {
      body.innerHTML = `<div style="color:var(--red);padding:24px;text-align:center">⚠️ ${escHtml(e.message||'Erro ao carregar.')}</div>`;
    }
  }

  async function renderFavoritos(body) {
    const r = await API.listings.favorites();
    const items = r?.data || [];
    if (!items.length) {
      body.innerHTML = emptyState('⭐', 'Nenhum favorito ainda', 'Anúncios que você favoritar aparecem aqui.', 'classificados', 'Ver anúncios');
      return;
    }
    const cards = (typeof Pages !== 'undefined' && Pages.listingCard)
      ? items.map(l => Pages.listingCard(l)).join('')
      : items.map(l => `<div onclick="App.navigate('listing','${l.id}')" style="padding:14px;background:var(--s2);border:1px solid var(--border);border-radius:10px;cursor:pointer;margin-bottom:8px">
          <div style="font-weight:600">${escHtml(l.title)}</div><div style="color:var(--q4)">${fmtBRL(l.price)}</div>
        </div>`).join('');
    body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">${cards}</div>`;
  }

  async function renderReservas(body) {
    const r = await API.rental.myBookings({ limit: 5 });
    const items = r?.data || [];
    if (!items.length) {
      body.innerHTML = emptyState('📋', 'Nenhuma reserva ainda', 'Reservas de aluguel que você fizer aparecem aqui.', 'aluguel', 'Ver veículos disponíveis');
      return;
    }
    const rows = items.map(b => `
      <div onclick="App.navigate('minhas-reservas')" style="display:flex;justify-content:space-between;align-items:center;
        padding:14px;background:var(--s2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;cursor:pointer">
        <div>
          <div style="font-weight:600;font-size:.86rem">${escHtml(b.config?.listing?.title || 'Reserva')}</div>
          <div style="color:var(--muted);font-size:.74rem;margin-top:2px">
            ${b.startDate ? new Date(b.startDate).toLocaleDateString('pt-BR') : ''} → ${b.endDate ? new Date(b.endDate).toLocaleDateString('pt-BR') : ''}
          </div>
        </div>
        <span style="font-size:.68rem;font-weight:700;color:${BOOKING_COLORS[b.status]||'var(--muted)'};
          background:rgba(255,255,255,.05);padding:4px 10px;border-radius:6px">${BOOKING_LABELS[b.status]||b.status}</span>
      </div>`).join('');
    body.innerHTML = rows + `<div onclick="App.navigate('minhas-reservas')" style="text-align:center;padding:12px;
      color:var(--neon);cursor:pointer;font-size:.82rem;font-weight:600">Ver todas as reservas →</div>`;
  }

  function renderConversas(body) {
    body.id = 'pcBody'; // ChatDM.renderInbox espera um id de container
    if (typeof ChatDM === 'undefined') { body.innerHTML = emptyState('💬','Chat indisponível','Tente novamente em instantes.'); return; }
    ChatDM.renderInbox('pcBody', 'buyer');
  }

  function emptyState(icon, title, desc, page, cta) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:48px 24px;text-align:center;gap:10px">
      <div style="font-size:2.4rem">${icon}</div>
      <div style="font-weight:700;font-size:1rem">${title}</div>
      <div style="color:var(--muted);font-size:.82rem;max-width:320px">${desc}</div>
      ${page ? `<button onclick="App.navigate('${page}')" style="margin-top:8px;background:var(--s2);
        border:1px solid var(--border);color:var(--text);padding:9px 18px;border-radius:8px;
        font-weight:600;cursor:pointer;font-size:.82rem">${cta}</button>` : ''}
    </div>`;
  }

  return { render, tab };
})();
