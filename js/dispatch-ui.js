
// ══════════════════════════════════════════════════════════════
// MOBYA — Dispatch UI (Fase 4B)
// Prestador recebe ofertas em tempo real via Socket.io /dispatch
// ══════════════════════════════════════════════════════════════
window.DispatchUI = (() => {
  const API_BASE = (window.MOBYA?.API || 'https://mobya.onrender.com') + '/api/v1';
  const WS_BASE  = API_BASE.replace('/api/v1','').replace('https://','wss://').replace('http://','ws://');

  let dispatchSocket = null;
  let countdownTimer = null;
  let currentOffer   = null;
  let pollTimer      = null;

  const OFFER_TIMEOUT_MS = 15000;
  const POLL_INTERVAL_MS = 8000;

  // ── Fallback REST: cobre os casos em que o Socket.io não entrega a
  // oferta em tempo real (reconexão, app em background, processo do
  // backend reiniciando). Sem isso, a única via era o socket — se ele
  // falhasse por qualquer motivo, a oferta se perdia silenciosamente. ──
  function _startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      if (currentOffer) return; // já tem modal aberto, não precisa consultar
      try {
        const r = await API.req('GET', '/emergency/my-offers');
        const offer = r?.data;
        if (offer && !currentOffer) {
          console.log('[Dispatch] Oferta encontrada via polling de fallback:', offer);
          _showOffer(offer);
        }
      } catch { /* silencioso — tenta de novo no próximo ciclo */ }
    }, POLL_INTERVAL_MS);
  }

  function _stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // ── Estilos do modal ──────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('dispatch-styles')) return;
    const s = document.createElement('style');
    s.id = 'dispatch-styles';
    s.textContent = `
      #dispatch-overlay {
        position:fixed;inset:0;z-index:9999;
        background:rgba(0,0,0,.75);
        display:flex;align-items:center;justify-content:center;
        animation:dp-fadein .2s ease;
      }
      @keyframes dp-fadein{from{opacity:0}to{opacity:1}}
      #dispatch-modal {
        background:var(--card-bg,#1a1a2e);
        border:1px solid var(--border,rgba(255,255,255,.1));
        border-radius:16px;width:calc(100% - 32px);max-width:380px;
        padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.6);
      }
      #dispatch-modal h2 {
        font-family:'Bebas Neue',sans-serif;font-size:1.5rem;
        letter-spacing:2px;color:var(--q4,#f59e0b);margin:0 0 4px;
      }
      #dispatch-modal .dp-type {
        font-size:.8rem;color:var(--muted,#888);margin-bottom:14px;
      }
      #dispatch-modal .dp-info {
        background:rgba(255,255,255,.05);border-radius:10px;
        padding:12px;margin-bottom:14px;font-size:.85rem;line-height:1.6;
      }
      #dispatch-modal .dp-info strong { color:var(--text,#fff); }
      #dispatch-modal .dp-info span   { color:var(--muted,#888); }
      #dispatch-countdown {
        text-align:center;font-size:2rem;font-weight:700;
        color:var(--q4,#f59e0b);margin-bottom:4px;
        font-family:'Bebas Neue',monospace;letter-spacing:2px;
      }
      #dispatch-countdown.urgent { color:#ef4444; }
      #dispatch-prog-wrap {
        height:4px;background:rgba(255,255,255,.1);border-radius:2px;
        margin-bottom:16px;overflow:hidden;
      }
      #dispatch-prog {
        height:100%;background:var(--q4,#f59e0b);
        transition:width .9s linear;border-radius:2px;
      }
      .dp-btns { display:flex;gap:10px; }
      .dp-btn-accept {
        flex:1;padding:12px;border-radius:10px;border:none;cursor:pointer;
        background:linear-gradient(135deg,#10b981,#059669);
        color:#fff;font-weight:700;font-size:.95rem;
        transition:opacity .15s;
      }
      .dp-btn-accept:active { opacity:.8; }
      .dp-btn-reject {
        flex:1;padding:12px;border-radius:10px;border:none;cursor:pointer;
        background:rgba(239,68,68,.15);color:#ef4444;
        border:1px solid rgba(239,68,68,.35);font-weight:600;font-size:.95rem;
        transition:opacity .15s;
      }
      .dp-btn-reject:active { opacity:.8; }
      #dispatch-badge {
        position:fixed;top:14px;right:14px;z-index:8888;
        background:var(--q4,#f59e0b);color:#000;
        border-radius:20px;padding:6px 14px;font-size:.78rem;
        font-weight:700;display:none;cursor:pointer;
        box-shadow:0 2px 12px rgba(245,158,11,.5);
        animation:dp-pulse 1.5s infinite;
      }
      @keyframes dp-pulse {
        0%,100%{transform:scale(1)}50%{transform:scale(1.05)}
      }
    `;
    document.head.appendChild(s);
  }

  // ── Renderiza modal de oferta ─────────────────────────────
  function _showOffer(offer) {
    _clearModal();
    currentOffer = offer;

    const overlay = document.createElement('div');
    overlay.id = 'dispatch-overlay';

    const typeLabels = {
      TOW:'🚛 Reboque', LOCKSMITH:'🔑 Chaveiro', FLAT_TIRE:'🔧 Pneu Furado',
      BATTERY:'🔋 Bateria', FUEL:'⛽ Combustível', ACCIDENT:'🚨 Acidente',
      OVERHEAT:'🌡️ Superaquecimento', FREIGHT:'📦 Frete',
      MECHANIC:'🔩 Mecânico', OTHER:'🛠️ Outro',
    };

    overlay.innerHTML = `
      <div id="dispatch-modal">
        <h2>⚡ NOVA OFERTA</h2>
        <div class="dp-type">${typeLabels[offer.type] || offer.type}</div>
        <div class="dp-info">
          ${offer.address ? `<div><span>📍 Local: </span><strong>${offer.address}</strong></div>` : ''}
          ${offer.estimatedCost ? `<div><span>💰 Estimativa: </span><strong>R$ ${Number(offer.estimatedCost).toFixed(2)}</strong></div>` : ''}
          ${offer.latitude && offer.longitude
            ? `<div><span>🗺️ Coords: </span><strong>${Number(offer.latitude).toFixed(5)}, ${Number(offer.longitude).toFixed(5)}</strong></div>`
            : ''}
        </div>
        <div id="dispatch-countdown">15</div>
        <div id="dispatch-prog-wrap"><div id="dispatch-prog" style="width:100%"></div></div>
        <div class="dp-btns">
          <button class="dp-btn-accept" onclick="DispatchUI.accept()">✅ Aceitar</button>
          <button class="dp-btn-reject" onclick="DispatchUI.reject()">❌ Rejeitar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Toca som de alerta se disponível
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 150, 300].forEach(delay => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880;
        g.gain.setValueAtTime(.3, ctx.currentTime + delay/1000);
        g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + delay/1000 + .15);
        o.start(ctx.currentTime + delay/1000);
        o.stop(ctx.currentTime + delay/1000 + .15);
      });
    } catch {}

    // Countdown visual
    const totalMs = offer.timeoutMs || OFFER_TIMEOUT_MS;
    const startTs = Date.now();
    const cdEl    = document.getElementById('dispatch-countdown');
    const progEl  = document.getElementById('dispatch-prog');

    countdownTimer = setInterval(() => {
      const elapsed = Date.now() - startTs;
      const rem     = Math.max(0, totalMs - elapsed);
      const secs    = Math.ceil(rem / 1000);
      if (cdEl) {
        cdEl.textContent = secs;
        cdEl.classList.toggle('urgent', secs <= 5);
      }
      if (progEl) progEl.style.width = ((rem / totalMs) * 100).toFixed(1) + '%';
      if (rem <= 0) _timeoutModal();
    }, 500);
  }

  function _clearModal() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    currentOffer   = null;
    document.getElementById('dispatch-overlay')?.remove();
  }

  // ── Oferta via alarme full-screen (SOS real) ──────────────
  // Usa window.SOSAlarm se o módulo js/sos-alarm.js estiver carregado;
  // senão cai pro modal antigo (_showOffer) como fallback de segurança.
  const typeLabelsFS = {
    TOW:'🚛 Reboque', LOCKSMITH:'🔑 Chaveiro', FLAT_TIRE:'🔧 Pneu Furado',
    BATTERY:'🔋 Bateria', FUEL:'⛽ Combustível', ACCIDENT:'🚨 Acidente',
    OVERHEAT:'🌡️ Superaquecimento', FREIGHT:'📦 Frete',
    MECHANIC:'🔩 Mecânico', OTHER:'🛠️ Outro',
  };

  function _showOfferFullScreen(offer) {
    if (typeof window.SOSAlarm === 'undefined') {
      _showOffer(offer); // fallback se sos-alarm.js não foi incluído na página
      return;
    }
    currentOffer = offer;
    const info = [];
    if (offer.address) info.push({ label: '📍 Local', value: offer.address });
    if (offer.estimatedCost) info.push({ label: '💰 Estimativa', value: `R$ ${Number(offer.estimatedCost).toFixed(2)}` });
    if (offer.latitude && offer.longitude) {
      info.push({ label: '🗺️ Coords', value: `${Number(offer.latitude).toFixed(5)}, ${Number(offer.longitude).toFixed(5)}` });
    }

    window.SOSAlarm.show({
      mode: 'provider',
      title: '⚡ NOVA OFERTA SOS',
      subtitle: typeLabelsFS[offer.type] || offer.type,
      info,
      countdownMs: offer.timeoutMs || OFFER_TIMEOUT_MS,
      onAccept: accept,
      onReject: reject,
      onTimeout: () => {
        currentOffer = null;
        if (typeof Toast !== 'undefined') Toast.show('⏱️ Tempo esgotado — oferta expirada.', 'warn');
      },
    });
  }

  function _timeoutModal() {
    _clearModal();
    if (typeof Toast !== 'undefined') Toast.show('⏱️ Tempo esgotado — oferta expirada.', 'warn');
  }

  // ── Aceitar oferta ────────────────────────────────────────
  async function accept() {
    if (!currentOffer) return;
    const { emergencyId } = currentOffer;
    _clearModal();
    window.SOSAlarm?.hide();
    try {
      const r = await API.req('POST', `/emergency/${emergencyId}/accept-offer`);
      if (r?.success) {
        if (typeof Toast !== 'undefined') Toast.show('✅ Oferta aceita! Abrindo GPS Tracking...', 'ok');
        window.__mobyaPendingEmergencyId = null;
        window.__mobyaTrackingSessionId = r?.data?.sessionId || null;
        if (typeof App !== 'undefined') App.navigate('ultra-gps');
      } else {
        if (typeof Toast !== 'undefined') Toast.show(r?.error?.message || 'Oferta indisponível.', 'err');
      }
    } catch (e) {
      if (typeof Toast !== 'undefined') Toast.show('Erro ao aceitar oferta.', 'err');
    }
  }

  // ── Rejeitar oferta ───────────────────────────────────────
  async function reject() {
    if (!currentOffer) return;
    const { emergencyId } = currentOffer;
    _clearModal();
    window.SOSAlarm?.hide();
    try {
      await API.req('POST', `/emergency/${emergencyId}/reject-offer`);
      if (typeof Toast !== 'undefined') Toast.show('Oferta rejeitada.', 'info');
    } catch {}
  }

  // ── Conecta ao namespace /dispatch ───────────────────────
  function connect() {
    const token = typeof API !== 'undefined' ? API.getToken() : null;
    if (!token) return;
    if (dispatchSocket?.connected) return;

    _injectStyles();

    // Badge de status de conexão dispatch
    let badge = document.getElementById('dispatch-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'dispatch-badge';
      badge.textContent = '📡 Aguardando ofertas';
      badge.onclick = () => { badge.style.display = 'none'; };
      document.body.appendChild(badge);
    }

    dispatchSocket = io(WS_BASE + '/dispatch', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 3000,
    });

    dispatchSocket.on('connect', () => {
      console.log('[Dispatch] Conectado ao namespace /dispatch');
      badge.style.display = 'block';
      setTimeout(() => { badge.style.display = 'none'; }, 3000);
    });

    _startPolling();

    dispatchSocket.on('disconnect', () => {
      console.log('[Dispatch] Desconectado de /dispatch');
    });

    dispatchSocket.on('dispatch_offer', (offer) => {
      console.log('[Dispatch] Oferta recebida:', offer);
      _showOfferFullScreen(offer);
    });

    dispatchSocket.on('dispatch_timeout', ({ emergencyId }) => {
      if (currentOffer?.emergencyId === emergencyId) {
        _timeoutModal();
      }
    });

    dispatchSocket.on('dispatch_taken', ({ emergencyId }) => {
      if (currentOffer?.emergencyId === emergencyId) {
        _clearModal();
        if (typeof Toast !== 'undefined') Toast.show('Esta emergência já foi aceita por outro prestador.', 'info');
      }
    });
  }

  function disconnect() {
    dispatchSocket?.disconnect();
    dispatchSocket = null;
    _stopPolling();
    _clearModal();
  }

  // ── Polling da cascata de dispatch (lado cliente/passageiro) ───
  // Exibe quantos prestadores foram acionados e o status em tempo real
  // na tela que aparece logo após o cliente criar a emergência.
  // Uso: DispatchUI.startStatusPoll(emergencyId, containerElement)
  // Para quando recebe status ACCEPTED ou EXPIRED ou ao sair da tela.
  let _statusPollTimer = null;

  let _lastAlertedStatus = null;

  function startStatusPoll(emergencyId, containerEl) {
    stopStatusPoll();
    _lastAlertedStatus = null;

    const STATUS_LABELS = {
      PENDING:  '⏳ Aguardando prestadores...',
      ACTIVE:   '📡 Despachando prestadores...',
      ACCEPTED: '✅ Prestador confirmado!',
      EXPIRED:  '⌛ Tempo esgotado — nenhum prestador disponível.',
      FAILED:   '❌ Falha no despacho.',
    };

    async function _tick() {
      try {
        const r = await API.emergency.dispatchStatus(emergencyId);
        const s = r?.data || r;
        if (!containerEl || !document.body.contains(containerEl)) { stopStatusPoll(); return; }

        const contacted  = s.contactedProviders  ?? s.contacted   ?? 0;
        const rejected   = s.rejectedProviders   ?? s.rejected    ?? 0;
        const timeout    = s.timeoutMs           ?? 0;
        const statusText = STATUS_LABELS[s.status] || s.status || '';
        const elapsed    = s.elapsedMs           ?? 0;
        const pct        = timeout > 0 ? Math.min(100, Math.round((elapsed / timeout) * 100)) : 0;

        containerEl.innerHTML = `
          <div style="background:var(--s2);border:1px solid var(--border);border-radius:12px;padding:14px;font-family:'Space Grotesk',sans-serif">
            <div style="font-size:.82rem;font-weight:700;color:var(--neon);margin-bottom:10px">📡 STATUS DO DESPACHO</div>
            <div style="font-size:.85rem;margin-bottom:8px">${statusText}</div>
            <div style="display:flex;gap:16px;margin-bottom:10px">
              <div style="text-align:center">
                <div style="font-size:1.4rem;font-weight:700;color:var(--neon)">${contacted}</div>
                <div style="font-size:.68rem;color:var(--muted)">ACIONADOS</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:1.4rem;font-weight:700;color:#ef4444">${rejected}</div>
                <div style="font-size:.68rem;color:var(--muted)">REJEITARAM</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:1.4rem;font-weight:700;color:#10b981">${Math.max(0, contacted - rejected)}</div>
                <div style="font-size:.68rem;color:var(--muted)">PENDENTES</div>
              </div>
            </div>
            ${timeout > 0 ? `
            <div style="height:4px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:var(--neon);border-radius:2px;transition:width .8s linear"></div>
            </div>
            <div style="font-size:.68rem;color:var(--muted);text-align:right;margin-top:3px">${pct}% do tempo decorrido</div>` : ''}
            ${s.acceptedProvider ? `<div style="margin-top:8px;font-size:.8rem;color:#10b981">✅ ${s.acceptedProvider}</div>` : ''}
          </div>`;

        // Dispara alarme full-screen pro cliente em transições importantes
        // (só uma vez por status, via flag local pra não repetir a cada tick).
        if (s.status !== _lastAlertedStatus && window.SOSAlarm) {
          if (s.status === 'ACCEPTED') {
            window.SOSAlarm.show({
              mode: 'client-accepted',
              title: '✅ PRESTADOR CONFIRMADO',
              subtitle: 'Ajuda a caminho! Acompanhe pelo GPS.',
              info: s.acceptedProvider ? [{ label: '🧑‍🔧 Prestador', value: s.acceptedProvider }] : [],
              onClose: () => {},
            });
          } else if (s.status === 'EXPIRED' || s.status === 'FAILED') {
            window.SOSAlarm.show({
              mode: 'client-failed',
              title: '⚠️ NENHUM PRESTADOR DISPONÍVEL',
              subtitle: 'Não conseguimos confirmar um prestador a tempo.',
              onRetry: () => { if (typeof App !== 'undefined') App.navigate('emergencia'); },
            });
          }
          _lastAlertedStatus = s.status;
        }

        // Para de pollar quando encerrado
        if (['ACCEPTED','EXPIRED','FAILED'].includes(s.status)) stopStatusPoll();
      } catch { /* falha silenciosa — tenta de novo */ }
    }

    _tick();
    _statusPollTimer = setInterval(_tick, 5000);
  }

  function stopStatusPoll() {
    clearInterval(_statusPollTimer);
    _statusPollTimer = null;
  }

  return { connect, disconnect, accept, reject, startStatusPoll, stopStatusPoll };
})();
