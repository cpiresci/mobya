window.Chat = (() => {
  let agent = 'orquestrador';
  let history = [];
  let busy = false;
  let conversationId = null;

  const AGENTS = {
    orquestrador: { name:'NEXUS-CORE', orb:'⬡', desc:'Orquestrador · 9 agentes ativos', sugs:['🚗 Quero comprar um carro','🔧 Diagnóstico de peça','🛡️ Cotar seguro','🚨 Preciso de guincho'] },
    compra:       { name:'NEXUS-CV',   orb:'🚗', desc:'Compra · Venda · FIPE · Anti-fraude', sugs:['Avaliar Honda Civic 2022 80.000km','Verificar preço na FIPE','Detectar fraudes no anúncio','Script para negociar'] },
    pecas:        { name:'NEXUS-PD',   orb:'🔧', desc:'Peças · Diagnóstico S2P · Preditiva', sugs:['Barulho ao frear','Motor superaquecendo','Luz do motor acesa','Plano manutenção preventiva'] },
    aluguel:      { name:'NEXUS-AL',   orb:'🗝️', desc:'Aluguel · Multi-locadora · CTR', sugs:['SUV por 3 dias em SP','Comparar Localiza vs Movida','Coberturas CDW e TP','Aluguel mensal PJ'] },
    servico:      { name:'NEXUS-SV',   orb:'🛠️', desc:'Serviços · SINDIREPA · CDC', sugs:['Revisão 30.000km — preço justo?','Como escolher boa oficina','Tenho direito a garantia?','Reclamar de serviço ruim'] },
    seguro:       { name:'NEXUS-SEG',  orb:'🛡️', desc:'Seguros · SUSEP · Sinistros', sugs:['Cotar seguro Honda Civic','O que fazer após batida','Seguro para Uber/99','Contestar valor de sinistro'] },
    financiamento:{ name:'NEXUS-FIN',  orb:'💰', desc:'CDC · Leasing · CET · TCO', sugs:['Simular financiamento R$80.000','Consórcio vs financiamento','Meu score é baixo, tenho chance?','Calcular TCO do meu carro'] },
    reboque:      { name:'NEXUS-RBQ',  orb:'🚛', desc:'SOS 24H · Guincho · Emergência', sugs:['Preciso de guincho agora','Tive um acidente na rodovia','Meu carro superaqueceu','Pneu furado na estrada'] },
    chaveiro:     { name:'NEXUS-CHV',  orb:'🔑', desc:'Chaveiro · Transponder · Segurança', sugs:['Chave quebrou na fechadura','Fiquei trancado no carro','Transponder não funciona','Instalar rastreador'] },
  };

  function render(containerId, initialAgent='orquestrador') {
    agent = initialAgent;
    history = [];
    conversationId = null;
    const a = AGENTS[agent];
    const chips = Object.entries(AGENTS).map(([id,ag]) =>
      `<div class="achip ${id===agent?'on':''}" onclick="Chat.selectAgent('${id}',this)">${ag.orb} ${ag.name}</div>`
    ).join('');
    const sugs = a.sugs.map(s => `<div class="sug" onclick="Chat.inject('${s.replace(/'/g,"\\'")}')"> ${s}</div>`).join('');
    document.getElementById(containerId).innerHTML = `
      <div class="chat-panel">
        <div class="chat-head">
          <div class="chat-orb" id="chatOrb">${a.orb}</div>
          <div class="chat-info"><h4 id="chatName">${a.name}</h4><p id="chatDesc">${a.desc}</p></div>
          <div class="chat-status"><div class="q-dot"></div>ONLINE</div>
          <div class="provider-tag" id="chatProvider">–</div>
        </div>
        <div class="agent-chips" id="agentChips">${chips}</div>
        <div class="sug-bar" id="sugBar">${sugs}</div>
        <div class="msgs" id="msgs"></div>
        <div class="chat-input-area">
          <textarea class="msg-input" id="msgInput" rows="1" placeholder="Pergunte qualquer coisa sobre veículos..." onkeydown="Chat.key(event)" oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"></textarea>
          <button class="send-btn" id="sendBtn" onclick="Chat.send()">➤</button>
        </div>
      </div>`;
    addMsg('ai', a.orb, `Olá! Sou o <strong>${a.name}</strong>. ${getGreeting(agent)}`);
  }

  function selectAgent(id, el) {
    document.querySelectorAll('.achip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
    agent = id;
    history = [];
    conversationId = null;
    const a = AGENTS[id];
    document.getElementById('chatOrb').textContent  = a.orb;
    document.getElementById('chatName').textContent = a.name;
    document.getElementById('chatDesc').textContent = a.desc;
    document.getElementById('chatProvider').textContent = '–';
    document.getElementById('msgs').innerHTML = '';
    document.getElementById('sugBar').innerHTML = a.sugs.map(s => `<div class="sug" onclick="Chat.inject('${s.replace(/'/g,"\\'")}')"> ${s}</div>`).join('');
    addMsg('ai', a.orb, `Sou o <strong>${a.name}</strong>. ${getGreeting(id)}`);
  }

  function inject(text) {
    const inp = document.getElementById('msgInput');
    if (inp) { inp.value = text; inp.dispatchEvent(new Event('input')); }
    send();
  }

  function key(e) { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); send(); } }

  // ── GEOLOCALIZAÇÃO (best-effort, nunca trava o envio) ──────
  function _getCoords() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 5000 }
      );
    });
  }

  async function send() {
    if (!API.isAuth()) { MobyaAuth.showLogin('chat'); return; }
    const inp  = document.getElementById('msgInput');
    const text = inp?.value?.trim();
    if (!text||busy) return;
    busy = true;
    inp.value = '';
    inp.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;
    addMsg('user','👤', escHtml(text));
    const tid = 'typing_'+Date.now();
    document.getElementById('msgs').innerHTML += `<div class="msg" id="${tid}"><div class="m-av ai">${AGENTS[agent].orb}</div><div class="m-bub ai"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
    scroll();
    history.push({ role:'user', content:text });
    try {
      const coords = await _getCoords();
      const r = await API.ai.chat({ agentType:agent, message:text, ...(conversationId && { conversationId }), ...coords });
      if (r.data.conversationId) conversationId = r.data.conversationId;
      history.push({ role:'assistant', content:r.data.reply });
      document.getElementById(tid)?.remove();
      addMsg('ai', AGENTS[agent].orb, fmt(r.data.reply));
      if (r.data.action) renderAction(r.data.action);
      if (r.data.provider) { const pt = document.getElementById('chatProvider'); if(pt) pt.textContent = r.data.provider; }
    } catch(e) {
      document.getElementById(tid)?.remove();
      addMsg('ai','⚠️',`<span style="color:var(--red)">${e.message||'Erro no Motor Quântico.'}</span>`);
    }
    scroll();
    busy = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('msgInput')?.focus();
  }

  // ── RENDERIZAÇÃO DE AÇÕES REAIS (resultado de chatActions.js no backend) ──
  function renderAction(action) {
    const area = document.getElementById('msgs');
    if (!area || !action?.type) return;

    let html = '';
    if (action.type === 'EMERGENCY_CREATED') {
      html = `
        <div class="action-card action-card--ok">
          <div class="action-card-icon">✅</div>
          <div class="action-card-body">
            <strong>Emergência registrada</strong>
            <p>Buscando o prestador mais próximo automaticamente...</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('gps-tracking')">Acompanhar</button>
        </div>`;
    } else if (action.type === 'NEEDS_LOCATION') {
      html = `
        <div class="action-card action-card--warn">
          <div class="action-card-icon">📍</div>
          <div class="action-card-body">
            <strong>Localização necessária</strong>
            <p>Permita o acesso à localização para que possamos acionar um prestador de verdade.</p>
          </div>
          <button class="action-card-btn" onclick="Chat.retryWithLocation()">Permitir e tentar de novo</button>
        </div>`;
    } else if (action.type === 'PROVIDERS_FOUND') {
      const count = action.count || 0;
      const targetRoute = action.vertical === 'SERVICE' ? 'servicos' : 'monetizacao';
      html = count > 0
        ? `
        <div class="action-card action-card--ok">
          <div class="action-card-icon">🛠️</div>
          <div class="action-card-body">
            <strong>${count} prestador(es) encontrado(s)</strong>
            <p>Parceiros cadastrados próximos da sua localização.</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('${targetRoute}')">Ver opções</button>
        </div>`
        : `
        <div class="action-card action-card--info">
          <div class="action-card-icon">ℹ️</div>
          <div class="action-card-body">
            <strong>Nenhum parceiro cadastrado nessa região ainda</strong>
            <p>Posso te dar orientações gerais enquanto isso.</p>
          </div>
        </div>`;
    } else if (action.type === 'OPEN_PARTS_QUOTE_FORM') {
      html = `
        <div class="action-card action-card--info">
          <div class="action-card-icon">🔧</div>
          <div class="action-card-body">
            <strong>Cotação real de peça</strong>
            <p>Preencha marca, modelo e a peça para um preço de verdade.</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('pecas')">Abrir formulário</button>
        </div>`;
    } else if (action.type === 'OPEN_LOGISTICS_QUOTE_FORM') {
      html = `
        <div class="action-card action-card--info">
          <div class="action-card-icon">🚚</div>
          <div class="action-card-body">
            <strong>Cotação real de frete</strong>
            <p>Preencha origem, destino e tipo de veículo para um preço de verdade.</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('fretes')">Abrir formulário</button>
        </div>`;
    } else if (action.type === 'OPEN_INSURANCE_QUOTE_FORM') {
      html = `
        <div class="action-card action-card--info">
          <div class="action-card-icon">🛡️</div>
          <div class="action-card-body">
            <strong>Simulação real de seguro</strong>
            <p>Preencha os dados do veículo e do condutor para uma simulação de verdade.</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('seguros-sim')">Abrir formulário</button>
        </div>`;
    }

    if (html) {
      area.innerHTML += `<div class="msg">${html}</div>`;
      scroll();
    }
  }

  // Reenvia a última mensagem do usuário depois que ele autorizar GPS
  function retryWithLocation() {
    const msgs = history.filter(m => m.role === 'user');
    const last = msgs[msgs.length - 1]?.content;
    if (!last) return;
    const inp = document.getElementById('msgInput');
    if (inp) { inp.value = last; send(); }
  }

  function addMsg(type, icon, html) {
    const area = document.getElementById('msgs');
    if (!area) return;
    area.innerHTML += `<div class="msg ${type==='user'?'user':''}"><div class="m-av ${type==='user'?'usr':'ai'}">${icon}</div><div class="m-bub ${type==='user'?'usr':'ai'}">${html}</div></div>`;
    scroll();
  }

  function scroll() { const a = document.getElementById('msgs'); if(a) setTimeout(()=>a.scrollTop=a.scrollHeight,50); }

  // SEGURANÇA: escapa ANTES de aplicar os replaces de markdown.
  // A resposta vem de um LLM (cascata de 4 provedores, alguns modelos
  // pequenos/gratuitos) — se o texto do usuário tiver prompt injection
  // pedindo pro modelo "ecoar" HTML/script, isso ia direto pro innerHTML
  // sem essa ordem. Os replaces abaixo reintroduzem só as tags seguras
  // (strong/em/code/br) depois do texto já estar escapado.
  function fmt(t) {
    return escHtml(t)
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`([^`\n]+)`/g,'<code>$1</code>')
      .replace(/\n\n/g,'<br><br>')
      .replace(/\n/g,'<br>');
  }

  function escHtml(t) { return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function getGreeting(id) {
    const g = { orquestrador:'Tenho 9 agentes especializados prontos. Como posso ajudar? 🚗', compra:'Me diga o veículo que quer avaliar — modelo, ano e km. 🚗', pecas:'Descreva o sintoma exato ou a peça que precisa. 🔧', aluguel:'Onde e quando precisa do veículo? 🗝️', servico:'Descreva o problema e a cidade. Vou estimar o custo. 🛠️', seguro:'Me diga o veículo, CEP e sua idade para calcular o risco. 🛡️', financiamento:'Me diga o valor do veículo e sua renda líquida. 💰', reboque:'🚨 Há feridos? Se sim, SAMU 192 imediatamente. Descreva sua situação.', chaveiro:'Me diga o modelo do veículo e o problema. 🔑' };
    return g[id] || 'Como posso ajudar?';
  }

  return { render, selectAgent, inject, key, send, retryWithLocation };
})();
