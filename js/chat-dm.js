// ============================================================
// MOBYA — chat-dm.js
// Chat humano<->humano (comprador/vendedor, locatário/anfitrião).
// Não confundir com chat.js/home-chat.js, que é o chat com IA (NEXUS).
// ============================================================
window.ChatDM = (() => {
  const API_BASE = (window.MOBYA?.API || 'https://mobya.onrender.com') + '/api/v1';
  const WS_BASE  = API_BASE.replace('/api/v1', '').replace('https://', 'wss://').replace('http://', 'ws://');

  let socket = null;
  let currentThreadId = null;
  let meId = null;

  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function ago(iso) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff/60)}min`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  }

  function ensureSocket() {
    if (socket?.connected) return socket;
    const token = API.getToken();
    if (!token) return null;
    socket = io(WS_BASE + '/chat', {
      auth: { token },
      transports: ['websocket','polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socket.on('connect_error', (e) => console.warn('[ChatDM] socket erro:', e.message));
    return socket;
  }

  // Abre (ou cria) a conversa a partir de um anúncio e navega pra tela de chat.
  async function openFromListing(listingId) {
    if (!API.isAuth()) { window.MobyaAuth?.showLogin('chat'); return; }
    try {
      const r = await API.chat.createThread({ listingId });
      const threadId = r?.data?.id;
      if (!threadId) throw new Error('Não foi possível abrir a conversa.');
      App.navigate('chat-thread', threadId);
    } catch (e) {
      App.toast(e?.message || 'Erro ao abrir conversa.', 'err');
    }
  }

  // ── Inbox: lista de conversas (usado na página "Conversas" e no painel do comprador) ──
  async function renderInbox(containerId, role) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!API.isAuth()) {
      el.innerHTML = `<div style="color:var(--muted);padding:32px;text-align:center">Faça login para ver suas conversas.</div>`;
      return;
    }
    el.innerHTML = `<div style="color:var(--muted);text-align:center;padding:32px;font-family:'JetBrains Mono',monospace;font-size:.73rem">⟳ Carregando conversas...</div>`;
    try {
      const r = await API.chat.threads(role ? { role } : {});
      const threads = r?.data || [];
      meId = window.MobyaAuth?.getUser?.()?.id || meId;
      if (!threads.length) {
        el.innerHTML = `<div style="color:var(--muted);padding:32px;text-align:center">Nenhuma conversa ainda.</div>`;
        return;
      }
      el.innerHTML = threads.map(t => {
        const isBuyer = t.buyerId === meId;
        const other = isBuyer ? t.seller : t.buyer;
        const last = t.messages?.[0];
        const unread = last && !last.readAt && last.senderId !== meId;
        return `<div onclick="ChatDM.open('${t.id}')" style="display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid var(--border);cursor:pointer">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--q2);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">
            ${other?.avatar ? `<img src="${other.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : (other?.name?.[0] || '?')}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span style="font-weight:${unread?'700':'600'}">${escHtml(other?.name || 'Usuário')}</span>
              <span style="font-size:.68rem;color:var(--muted);flex-shrink:0">${ago(last?.createdAt || t.lastMessageAt)}</span>
            </div>
            <div style="font-size:.78rem;color:${unread?'var(--text)':'var(--muted)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${escHtml(t.listing?.title || '')}${last ? ' · ' + escHtml(last.content) : ''}
            </div>
          </div>
          ${unread ? `<div style="width:9px;height:9px;border-radius:50%;background:var(--neon);flex-shrink:0"></div>` : ''}
        </div>`;
      }).join('');
    } catch (e) {
      el.innerHTML = `<div style="color:var(--red);padding:32px">⚠️ ${escHtml(e.message)}</div>`;
    }
  }

  function open(threadId) { App.navigate('chat-thread', threadId); }

  // ── Tela de uma conversa específica ──
  async function renderThread(containerId, threadId) {
    const el = document.getElementById(containerId);
    if (!el || !threadId) return;
    if (!API.isAuth()) { window.MobyaAuth?.showLogin('chat'); return; }
    currentThreadId = threadId;
    meId = window.MobyaAuth?.getUser?.()?.id || meId;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;height:calc(100vh - 160px);max-height:640px;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--s2)">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
          <button onclick="App.navigate('conversas')" style="background:none;border:none;color:var(--muted);font-size:1.1rem;cursor:pointer">←</button>
          <div id="dmHeaderName" style="font-weight:700">Carregando...</div>
        </div>
        <div id="dmMsgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px"></div>
        <div style="padding:10px;border-top:1px solid var(--border);display:flex;gap:8px">
          <textarea id="dmInput" rows="1" placeholder="Escreva uma mensagem..." style="flex:1;background:var(--s3);border:1px solid var(--border);border-radius:9px;padding:10px 12px;color:var(--text);font-family:inherit;font-size:.85rem;resize:none" onkeydown="ChatDM.key(event)"></textarea>
          <button onclick="ChatDM.send()" style="background:linear-gradient(135deg,var(--neon),#0891b2);color:#000;border:none;border-radius:9px;padding:0 16px;font-weight:700;cursor:pointer">➤</button>
        </div>
      </div>`;

    try {
      const [threadsR, msgsR] = await Promise.all([
        API.chat.threads(),
        API.chat.messages(threadId),
      ]);
      const thread = (threadsR?.data || []).find(t => t.id === threadId);
      const other = thread ? (thread.buyerId === meId ? thread.seller : thread.buyer) : null;
      const nameEl = document.getElementById('dmHeaderName');
      if (nameEl) nameEl.textContent = other?.name || 'Conversa';

      const msgs = msgsR?.data || [];
      const box = document.getElementById('dmMsgs');
      if (box) {
        box.innerHTML = msgs.map(renderBubble).join('');
        box.scrollTop = box.scrollHeight;
      }
      API.chat.markRead(threadId).catch(() => {});

      const s = ensureSocket();
      if (s) {
        s.emit('chat:join', threadId);
        s.off('chat:message').on('chat:message', (m) => {
          if (m.threadId !== currentThreadId && !m.id) return;
          const box2 = document.getElementById('dmMsgs');
          if (box2 && currentThreadId === threadId) {
            box2.insertAdjacentHTML('beforeend', renderBubble(m));
            box2.scrollTop = box2.scrollHeight;
          }
        });
      }
    } catch (e) {
      const box = document.getElementById('dmMsgs');
      if (box) box.innerHTML = `<div style="color:var(--red);padding:16px">⚠️ ${escHtml(e.message)}</div>`;
    }
  }

  function renderBubble(m) {
    const mine = m.senderId === meId;
    return `<div style="align-self:${mine?'flex-end':'flex-start'};max-width:75%">
      <div style="background:${mine?'linear-gradient(135deg,var(--neon),#0891b2)':'var(--s3)'};color:${mine?'#000':'var(--text)'};padding:9px 13px;border-radius:12px;font-size:.85rem;word-break:break-word">${escHtml(m.content)}</div>
      <div style="font-size:.62rem;color:var(--muted);margin-top:2px;text-align:${mine?'right':'left'}">${ago(m.createdAt)}</div>
    </div>`;
  }

  function key(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }

  async function send() {
    const inp = document.getElementById('dmInput');
    const content = inp?.value?.trim();
    if (!content || !currentThreadId) return;
    inp.value = '';
    const box = document.getElementById('dmMsgs');
    const optimistic = { id: 'tmp_'+Date.now(), senderId: meId, content, createdAt: new Date().toISOString() };
    if (box) { box.insertAdjacentHTML('beforeend', renderBubble(optimistic)); box.scrollTop = box.scrollHeight; }

    const s = ensureSocket();
    if (s?.connected) {
      s.emit('chat:message', { threadId: currentThreadId, content });
    } else {
      try { await API.chat.send(currentThreadId, { content }); }
      catch (e) { App.toast(e?.message || 'Erro ao enviar mensagem.', 'err'); }
    }
  }

  return { openFromListing, open, renderInbox, renderThread, key, send };
})();
