// MOBYA — keep-alive.js (Render Free Tier Wake-Up)
window.KeepAlive = (() => {
  const INTERVAL_MS = 4 * 60 * 1000;
  const HOUR_START  = 7;
  const HOUR_END    = 23;

  function isComercial() {
    const brt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return brt.getHours() >= HOUR_START && brt.getHours() < HOUR_END;
  }

  async function ping() {
    if (!isComercial()) return;
    try {
      await API.ping();
      const dot = document.getElementById('apiDot');
      const txt = document.getElementById('apiTxt');
      if (dot) { dot.style.background='var(--green,#10b981)'; dot.style.boxShadow='0 0 6px var(--green,#10b981)'; }
      if (txt) txt.textContent = 'ONLINE';
    } catch {
      const dot = document.getElementById('apiDot');
      const txt = document.getElementById('apiTxt');
      if (dot) { dot.style.background='var(--red,#ef4444)'; dot.style.boxShadow='none'; }
      if (txt) txt.textContent = 'RECONECTANDO';
    }
  }

  function init() {
    ping();
    setInterval(ping, INTERVAL_MS);
    console.log('[KeepAlive] Ativo — ping a cada 4 min (7h–23h BRT)');
  }

  return { init, ping };
})();
