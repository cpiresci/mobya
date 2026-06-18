window.API = (() => {
  const base = () => window.MOBYA.API;
  let _token = localStorage.getItem('mobya_token') || null;

  const setToken  = (t) => { _token = t; if(t) localStorage.setItem('mobya_token',t); else localStorage.removeItem('mobya_token'); };
  const getToken  = ()  => _token;
  const isAuth    = ()  => !!_token;

  async function req(path, opts = {}) {
    const url = `${base()}/api/v1${path}`;
    const headers = { 'Content-Type':'application/json', ...(opts.headers||{}) };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    try {
      const res  = await fetch(url, { method: opts.method||'GET', headers, credentials:'include', body: opts.body ? JSON.stringify(opts.body) : undefined, signal: opts.signal });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { setToken(null); window.dispatchEvent(new Event('mobya:logout')); throw { status:401, message:'Sessão expirada.' }; }
      if (!res.ok) throw { status: res.status, message: data?.error?.message || 'Erro na requisição.', code: data?.error?.code };
      return data;
    } catch(e) {
      if (e.status) throw e;
      throw { status:0, message:'Sem conexão com o servidor.' };
    }
  }

  const get    = (p, o={})    => req(p, { ...o, method:'GET' });
  const post   = (p, b, o={}) => req(p, { ...o, method:'POST',  body:b });
  const put    = (p, b, o={}) => req(p, { ...o, method:'PUT',   body:b });
  const patch  = (p, b, o={}) => req(p, { ...o, method:'PATCH', body:b });
  const del    = (p, o={})    => req(p, { ...o, method:'DELETE' });

  const auth = {
    register: (d)    => post('/auth/register', d),
    login:    (d)    => post('/auth/login',    d),
    logout:   ()     => post('/auth/logout',   {}),
    me:       ()     => get('/auth/me'),
    updateMe: (d)    => patch('/auth/me',      d),
  };

  const ai = {
    agents:      ()  => get('/ai/agents'),
    providers:   ()  => get('/ai/providers'),
    chat:        (d) => post('/ai/chat',                 d),
    diagnose:    (d) => post('/ai/diagnose',             d),
    fraud:       (d) => post('/ai/fraud-analysis',       d),
    insurance:   (d) => post('/ai/insurance-score',      d),
    financing:   (d) => post('/ai/financing-simulation', d),
  };

  const listings = {
    search:   (p={}) => get(`/listings?${new URLSearchParams(p)}`),
    get:      (id)   => get(`/listings/${id}`),
    create:   (d)    => post('/listings', d),
    update:   (id,d) => put(`/listings/${id}`, d),
    remove:   (id)   => del(`/listings/${id}`),
    favorite: (id)   => post(`/listings/${id}/favorite`, {}),
    mine:     (p={}) => get(`/listings/mine?${new URLSearchParams(p)}`),
  };

  const emergency = {
    create:  (d)    => post('/emergency', d),
    mine:    (p={}) => get(`/emergency/mine?${new URLSearchParams(p)}`),
    update:  (id,d) => patch(`/emergency/${id}/status`, d),
    nearby:  (lat, lng, opts={}) =>
      get(`/emergency/nearby?latitude=${lat}&longitude=${lng}` +
          `&radiusKm=${opts.radiusKm||50}` +
          (opts.vertical ? `&vertical=${opts.vertical}` : '')),
  };

  const monetization = {
    rates:            ()       => get('/monetization/rates'),
    categories:       ()       => get('/monetization/categories'),
    providers:        (p={})   => get(`/monetization/providers?${new URLSearchParams(p)}`),
    createProvider:   (d)      => post('/monetization/providers', d),
    rateProvider:     (id,d)   => post(`/monetization/providers/${id}/rating`, d),
    quotes:           (p={})   => get(`/monetization/quotes/mine?${new URLSearchParams(p)}`),
    createQuote:      (d)      => post('/monetization/quotes', d),
    acceptQuote:      (id)     => patch(`/monetization/quotes/${id}/accept`, {}),
    completeQuote:    (id,d)   => patch(`/monetization/quotes/${id}/complete`, d||{}),
    commissionsMine:  (p={})   => get(`/monetization/commissions/mine?${new URLSearchParams(p)}`),
    dashboard:        ()       => get('/monetization/dashboard'),
    simulateInsurance:(d)      => post('/monetization/insurance/simulate', d),
    quoteLogistics:   (d)      => post('/monetization/logistics/quote', d),
  };

  function pollEmergency(emergencyId, onUpdate, intervalMs = 10000) {
    const TERMINAL = ['COMPLETED', 'CANCELLED'];
    let timer = null;
    let active = true;
    async function tick() {
      if (!active) return;
      try {
        const data = await get('/emergency/mine');
        const em = (data?.data || []).find(e => e.id === emergencyId);
        if (em) {
          onUpdate(em);
          if (TERMINAL.includes(em.status)) { active = false; return; }
        }
      } catch (_) {}
      if (active) timer = setTimeout(tick, intervalMs);
    }
    tick();
    return { stop: () => { active = false; if (timer) clearTimeout(timer); } };
  }

  async function ping() {
    try {
      const d = await get('/health');
      const ok = d?.status === 'healthy';
      updateStatus(ok, d);
      return ok;
    } catch { updateStatus(false); return false; }
  }

  function updateStatus(ok, data) {
    const dot = document.getElementById('apiDot');
    const txt = document.getElementById('apiTxt');
    const sb  = document.getElementById('sbSambanova');
    if (dot) { dot.style.background = ok ? 'var(--neon)' : 'var(--red)'; dot.style.boxShadow = ok ? '0 0 8px var(--neon)' : '0 0 8px var(--red)'; }
    if (txt) txt.textContent = ok ? 'QUANTUM ONLINE' : 'API OFFLINE';
    if (data?.providers) {
      data.providers.forEach(p => {
        const el = document.getElementById(`sb${p.name.replace(/\s/g,'')}`);
        if (el) el.textContent = p.configured ? '● ON' : '● –';
      });
    }
  }

  return { setToken, getToken, isAuth, get, post, put, patch, del, auth, ai, listings, emergency, monetization, pollEmergency, ping };
})();
