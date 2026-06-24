// js/sos-alarm.js
// ══════════════════════════════════════════════════════════════
// MOBYA — SOS Alarm (Fase: SOS Emergency Full-Screen)
// Alarme full-screen real para prestador (oferta chegando) e
// cliente (status do socorro). Cobre 100% da tela, sirene em
// loop, vibração e Wake Lock (mantém tela acesa).
//
// Uso:
//   SOSAlarm.show({
//     mode: 'provider' | 'client-waiting' | 'client-accepted' | 'client-failed',
//     title, subtitle, info: [{label,value}],
//     countdownMs,            // opcional — mostra contagem regressiva
//     onAccept, onReject,     // mode 'provider'
//     onRetry, onClose,       // mode 'client-failed' / 'client-accepted'
//   });
//   SOSAlarm.hide();
// ══════════════════════════════════════════════════════════════
window.SOSAlarm = (() => {
  let audioCtx       = null;
  let sirenInterval   = null;
  let countdownTimer  = null;
  let wakeLock        = null;
  let vibrateInterval = null;
  let _opts           = null;

  // ── Sirene em loop (dois tons alternando, estilo alarme real) ──
  function _startSiren() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const tones = [880, 660];
      let i = 0;
      const playTone = () => {
        if (!audioCtx) return;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.frequency.value = tones[i % 2];
        g.gain.setValueAtTime(0.001, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.35, audioCtx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
        o.start();
        o.stop(audioCtx.currentTime + 0.5);
        i++;
      };
      playTone();
      sirenInterval = setInterval(playTone, 500);
    } catch (e) { console.warn('[SOSAlarm] Áudio indisponível:', e.message); }
  }

  function _stopSiren() {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }

  // ── Vibração contínua (padrão chamada recebida) ──
  function _startVibrate() {
    if (!navigator.vibrate) return;
    const pattern = [400, 200, 400, 600];
    navigator.vibrate(pattern);
    vibrateInterval = setInterval(() => navigator.vibrate(pattern), 1600);
  }

  function _stopVibrate() {
    clearInterval(vibrateInterval);
    vibrateInterval = null;
    if (navigator.vibrate) navigator.vibrate(0);
  }

  // ── Wake Lock (mantém tela acesa enquanto o alarme estiver ativo) ──
  async function _acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) { console.warn('[SOSAlarm] Wake Lock indisponível:', e.message); }
  }

  function _releaseWakeLock() {
    try { wakeLock?.release(); } catch {}
    wakeLock = null;
  }

  // Reaquire o Wake Lock se o documento voltar a ficar visível
  // (Android libera o lock automaticamente ao trocar de app).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.getElementById('sos-alarm-overlay')) {
      _acquireWakeLock();
    }
  });

  // ── Estilos ──
  function _injectStyles() {
    if (document.getElementById('sos-alarm-styles')) return;
    const s = document.createElement('style');
    s.id = 'sos-alarm-styles';
    s.textContent = `
      #sos-alarm-overlay {
        position:fixed;inset:0;z-index:99999;
        background:linear-gradient(160deg,#1a0000,#3a0000 60%,#1a0000);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        animation:sos-pulse-bg 1s ease-in-out infinite;
        padding:24px;text-align:center;
      }
      @keyframes sos-pulse-bg {
        0%,100% { background-position:0 0; filter:brightness(1); }
        50%     { filter:brightness(1.15); }
      }
      #sos-alarm-overlay.sos-calm {
        background:linear-gradient(160deg,#001a0a,#003318 60%,#001a0a);
        animation:none;
      }
      #sos-alarm-icon { font-size:4rem;animation:sos-bounce .6s ease-in-out infinite; margin-bottom:8px; }
      @keyframes sos-bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
      #sos-alarm-title {
        font-family:'Bebas Neue',sans-serif;font-size:1.9rem;letter-spacing:3px;
        color:#fff;margin:0 0 4px;
      }
      #sos-alarm-subtitle { color:#ffb3b3;font-size:.95rem;margin-bottom:18px; }
      .sos-calm #sos-alarm-subtitle { color:#a3f0c4; }
      #sos-alarm-info {
        background:rgba(255,255,255,.08);border-radius:14px;padding:14px 18px;
        margin-bottom:18px;max-width:340px;width:100%;font-size:.88rem;line-height:1.7;
      }
      #sos-alarm-info div span { color:#ffcccc; }
      .sos-calm #sos-alarm-info div span { color:#cdf5da; }
      #sos-alarm-info div strong { color:#fff; }
      #sos-alarm-countdown {
        font-family:'Bebas Neue',monospace;font-size:3rem;font-weight:700;
        color:#fff;margin-bottom:18px;
      }
      .sos-alarm-btns { display:flex;gap:14px;width:100%;max-width:340px; }
      .sos-btn {
        flex:1;padding:16px;border-radius:14px;border:none;cursor:pointer;
        font-weight:700;font-size:1rem;transition:opacity .15s;
      }
      .sos-btn:active { opacity:.75; }
      .sos-btn-accept { background:linear-gradient(135deg,#10b981,#059669);color:#fff; }
      .sos-btn-reject { background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.3); }
      .sos-btn-single { background:linear-gradient(135deg,#f59e0b,#d97706);color:#000; }
    `;
    document.head.appendChild(s);
  }

  function _clear() {
    _stopSiren();
    _stopVibrate();
    _releaseWakeLock();
    clearInterval(countdownTimer);
    countdownTimer = null;
    document.getElementById('sos-alarm-overlay')?.remove();
    _opts = null;
  }

  const ICONS = {
    'provider':         '🚨',
    'client-waiting':   '📡',
    'client-accepted':  '✅',
    'client-failed':    '⚠️',
  };

  const CALM_MODES = new Set(['client-accepted']);

  function show(opts) {
    _clear();
    _opts = opts;
    _injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'sos-alarm-overlay';
    if (CALM_MODES.has(opts.mode)) overlay.classList.add('sos-calm');

    const infoHtml = (opts.info || [])
      .map(i => `<div><span>${i.label}: </span><strong>${i.value}</strong></div>`)
      .join('');

    let btnsHtml = '';
    if (opts.mode === 'provider') {
      btnsHtml = `
        <div class="sos-alarm-btns">
          <button class="sos-btn sos-btn-accept" id="sos-btn-accept">✅ Aceitar</button>
          <button class="sos-btn sos-btn-reject" id="sos-btn-reject">❌ Rejeitar</button>
        </div>`;
    } else if (opts.mode === 'client-failed') {
      btnsHtml = `
        <div class="sos-alarm-btns">
          <button class="sos-btn sos-btn-single" id="sos-btn-retry">🔄 Tentar novamente</button>
        </div>`;
    } else if (opts.mode === 'client-accepted') {
      btnsHtml = `
        <div class="sos-alarm-btns">
          <button class="sos-btn sos-btn-accept" id="sos-btn-close">Continuar</button>
        </div>`;
    }

    overlay.innerHTML = `
      <div id="sos-alarm-icon">${ICONS[opts.mode] || '🚨'}</div>
      <h1 id="sos-alarm-title">${opts.title || 'SOS'}</h1>
      <div id="sos-alarm-subtitle">${opts.subtitle || ''}</div>
      ${infoHtml ? `<div id="sos-alarm-info">${infoHtml}</div>` : ''}
      ${opts.countdownMs ? `<div id="sos-alarm-countdown"></div>` : ''}
      ${btnsHtml}
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#sos-btn-accept')?.addEventListener('click', () => { hide(); opts.onAccept?.(); });
    overlay.querySelector('#sos-btn-reject')?.addEventListener('click', () => { hide(); opts.onReject?.(); });
    overlay.querySelector('#sos-btn-retry')?.addEventListener('click', () => { hide(); opts.onRetry?.(); });
    overlay.querySelector('#sos-btn-close')?.addEventListener('click', () => { hide(); opts.onClose?.(); });

    // Sirene/vibração só nos modos urgentes (não no calmo de "aceito")
    if (!CALM_MODES.has(opts.mode)) {
      _startSiren();
      _startVibrate();
    }
    _acquireWakeLock();

    if (opts.countdownMs) {
      const totalMs = opts.countdownMs;
      const startTs = Date.now();
      const cdEl = overlay.querySelector('#sos-alarm-countdown');
      countdownTimer = setInterval(() => {
        const rem = Math.max(0, totalMs - (Date.now() - startTs));
        if (cdEl) cdEl.textContent = Math.ceil(rem / 1000);
        if (rem <= 0) {
          clearInterval(countdownTimer);
          opts.onTimeout ? opts.onTimeout() : hide();
        }
      }, 250);
    }
  }

  function hide() { _clear(); }
  function isShowing() { return !!document.getElementById('sos-alarm-overlay'); }

  return { show, hide, isShowing };
})();
