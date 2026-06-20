
// ============================================================
// MOBYA — home-chat.js  NEXUS v5.0
// 9 agentes, sugestões contextuais, reset ao sair da home.
// ============================================================
window.HomeChat = (() => {
  let agent   = 'orquestrador';
  let history = [];
  let busy    = false;
  let conversationId = null;
  let initialized    = false;

  const AGENTS = {
    orquestrador: {
      name:'NEXUS-CORE', orb:'⬡', desc:'Orquestrador · 9 agentes ativos',
      sugs:[
        { icon:'🚗', q:'Quero comprar um Honda Civic 2022 com 80.000km — qual o preço justo?', short:'Avaliar Civic 2022' },
        { icon:'🔧', q:'Meu motor está fazendo barulho ao frear. O que pode ser?', short:'Barulho ao frear' },
        { icon:'🛡️', q:'Quero cotar seguro para um Corolla 2021 no CEP 01310-100', short:'Cotar seguro' },
        { icon:'🚨', q:'Tive um acidente e preciso de guincho urgente na Rodovia Anhanguera', short:'Guincho urgente' },
        { icon:'💰', q:'Simular financiamento de R$80.000 em 48x com renda de R$5.000', short:'Simular financiamento' },
        { icon:'🔍', q:'Como verificar se um carro tem histórico de batida antes de comprar?', short:'Verificar histórico' },
      ]
    },
    compra:{ name:'NEXUS-CV', orb:'🚗', desc:'Compra · Venda · FIPE · Anti-fraude',
      sugs:[
        { icon:'📊', q:'Avaliar Honda Civic 2022 com 80.000km — preço justo pela FIPE?', short:'FIPE Civic 2022' },
        { icon:'🕵️', q:'Como detectar fraudes em anúncio de veículo antes de comprar?', short:'Detectar fraude' },
        { icon:'📝', q:'Me dê um script para negociar o preço do carro com o vendedor', short:'Script negociação' },
        { icon:'📋', q:'Quais documentos verificar na hora de comprar um carro usado?', short:'Documentos compra' },
      ]
    },
    pecas:{ name:'NEXUS-PD', orb:'🔧', desc:'Peças · Diagnóstico · Manutenção preditiva',
      sugs:[
        { icon:'🔊', q:'Barulho metálico ao frear em baixa velocidade — o que pode ser?', short:'Barulho ao frear' },
        { icon:'🌡️', q:'Motor do meu carro superaquece no trânsito. Quais as causas?', short:'Motor superaquecendo' },
        { icon:'💡', q:'Luz do motor acendeu no painel. O que devo fazer primeiro?', short:'Luz do motor' },
        { icon:'📅', q:'Plano de manutenção preventiva para Onix 2020 com 50.000km', short:'Plano manutenção' },
      ]
    },
    seguro:{ name:'NEXUS-SEG', orb:'🛡️', desc:'Seguros · SUSEP · Sinistros',
      sugs:[
        { icon:'💲', q:'Cotar seguro para Honda Civic 2021 no CEP 04538-132 — perfil 30 anos', short:'Cotar seguro' },
        { icon:'🚙', q:'O que fazer imediatamente após sofrer uma batida de carro?', short:'Pós-acidente' },
        { icon:'📱', q:'Como funciona seguro para motoristas de aplicativo Uber/99?', short:'Seguro app' },
        { icon:'⚖️', q:'Posso contestar o valor do sinistro que a seguradora me ofereceu?', short:'Contestar sinistro' },
      ]
    },
    financiamento:{ name:'NEXUS-FIN', orb:'💰', desc:'CDC · Leasing · CET · TCO',
      sugs:[
        { icon:'🧮', q:'Simular financiamento de R$80.000 em 48 parcelas com renda de R$5.000', short:'Simular 48x' },
        { icon:'⚖️', q:'Consórcio ou financiamento direto — o que compensa mais em 2025?', short:'Consórcio vs financ.' },
        { icon:'📉', q:'Meu score está baixo. Tenho chance de financiar um carro?', short:'Score baixo' },
        { icon:'💸', q:'Calcular TCO (Custo Total de Propriedade) de um SUV popular', short:'Calcular TCO' },
      ]
    },
    reboque:{ name:'NEXUS-RBQ', orb:'🚛', desc:'SOS 24H · Guincho · Emergência',
      sugs:[
        { icon:'🆘', q:'Preciso de guincho urgente — como acionar o mais rápido?', short:'Guincho agora' },
        { icon:'💥', q:'Tive um acidente na rodovia — quais os primeiros passos?', short:'Acidente rodovia' },
        { icon:'🌡️', q:'Meu carro superaqueceu e está parado na estrada — o que fazer?', short:'Superaquecimento' },
        { icon:'🔴', q:'Pneu furado na estrada à noite — passo a passo de segurança', short:'Pneu furado' },
      ]
    },
    aluguel:{ name:'NEXUS-AL', orb:'🗝️', desc:'Aluguel · Multi-locadora · CTR',
      sugs:[
        { icon:'🏙️', q:'Melhores SUVs para alugar por 3 dias em São Paulo com seguro incluso', short:'SUV 3 dias SP' },
        { icon:'🔄', q:'Comparar preços Localiza, Movida e Unidas para a mesma data', short:'Comparar locadoras' },
        { icon:'🛡️', q:'O que são coberturas CDW e TP no contrato de aluguel?', short:'CDW e TP' },
        { icon:'🏢', q:'Quais as vantagens do aluguel mensal PJ para empresa?', short:'Aluguel mensal PJ' },
      ]
    },
    servico:{ name:'NEXUS-SV', orb:'🛠️', desc:'Serviços · SINDIREPA · CDC',
      sugs:[
        { icon:'💰', q:'Revisão aos 30.000km — quanto devo pagar em média?', short:'Custo revisão 30k' },
        { icon:'🔎', q:'Como escolher uma boa oficina mecânica na minha cidade?', short:'Escolher oficina' },
        { icon:'⚖️', q:'Tenho direito a garantia em serviço mal feito na oficina?', short:'Garantia serviço' },
        { icon:'📢', q:'Como reclamar de serviço ruim em oficina pelo Procon?', short:'Reclamar Procon' },
      ]
    },
    chaveiro:{ name:'NEXUS-CHV', orb:'🔑', desc:'Chaveiro · Transponder · Segurança',
      sugs:[
        { icon:'🔒', q:'Chave quebrou na fechadura do carro — como resolver?', short:'Chave quebrada' },
        { icon:'🚗', q:'Fiquei trancado dentro do carro — o que fazer?', short:'Trancado no carro' },
        { icon:'📡', q:'Transponder da chave não funciona — tem conserto?', short:'Transponder' },
        { icon:'🛡️', q:'Instalar rastreador veicular — qual o melhor para meu caso?', short:'Rastreador' },
      ]
    },
  };

  // chamado por App.navigate quando SAI da home
  function reset() {
    initialized = false;
    agent = 'orquestrador';
    history = [];
    conversationId = null;
    busy = false;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    agent = 'orquestrador';
    history = [];
    conversationId = null;
    busy = false;
    _renderChips();
    _clearMsgs();
    _addMsg('ai', AGENTS[agent].orb,
      'Olá! Sou o <strong>NEXUS-CORE</strong>, orquestrador quântico da MOBYA.<br>' +
      'Tenho 9 agentes especializados prontos para você. Como posso ajudar? 🚗');
    _renderExamplesInMsgs();
  }

  function _clearMsgs() {
    const el = document.getElementById('qcmMsgs');
    if (el) el.innerHTML = '';
  }

  function _renderChips() {
    const el = document.getElementById('qcmChips');
    if (!el) return;
    el.innerHTML = Object.entries(AGENTS).map(([id, ag]) =>
      `<div class="qcm-chip ${id===agent?'on':''}" onclick="HomeChat.selectAgent('${id}',this)">${ag.orb} ${ag.name}</div>`
    ).join('');
  }

  // Exemplos agora vivem DENTRO da própria área de resposta (qcmMsgs),
  // como um cartão de sugestões — não mais numa faixa separada acima.
  function _renderExamplesInMsgs() {
    const area = document.getElementById('qcmMsgs');
    if (!area) return;
    const sugs = AGENTS[agent].sugs;
    const html =
      `<div class="qcm-ex-grid" id="qcmExGrid">` +
      sugs.map(s =>
        `<div class="qcm-ex" onclick="HomeChat.inject('${s.q.replace(/'/g,"\\'")}')">` +
        `<span class="qcm-ex-ico">${s.icon}</span>` +
        `<span class="qcm-ex-txt">${s.short}</span></div>`
      ).join('') +
      `</div>`;
    area.insertAdjacentHTML('beforeend', html);
    _scroll();
  }

  function _removeExamples() {
    document.getElementById('qcmExGrid')?.remove();
  }

  // Trocar de agente NÃO troca a identidade do cabeçalho (que permanece
  // sempre NEXUS-CORE, o orquestrador) — a seleção visível do agente fica
  // só nos chips, no topo. O nome do agente não precisa reaparecer nas
  // mensagens, evitando redundância.
  function selectAgent(id, el) {
    document.querySelectorAll('.qcm-chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
    agent = id;
    history = [];
    conversationId = null;
    const prov = document.getElementById('qcmProvider');
    if (prov) prov.textContent = '-';
    _clearMsgs();
    _addMsg('ai', AGENTS[id].orb, _greeting(id));
    _renderExamplesInMsgs();
  }

  function inject(text) {
    const inp = document.getElementById('qcmTextarea');
    if (inp) {
      inp.value = text;
      inp.dispatchEvent(new Event('input'));
    }
    send();
  }

  function key(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // GEOLOCALIZACAO (best-effort, nunca trava o envio)
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
    const inp  = document.getElementById('qcmTextarea');
    const text = inp?.value?.trim();
    if (!text || busy) return;
    busy = true;
    inp.value = '';
    inp.style.height = 'auto';
    const btn = document.getElementById('qcmSend');
    if (btn) btn.disabled = true;

    // ocultar sugestões após primeira mensagem
    _removeExamples();

    _addMsg('user', '👤', _esc(text));

    const tid  = 'typing_' + Date.now();
    const msgs = document.getElementById('qcmMsgs');
    if (msgs) msgs.innerHTML +=
      `<div class="qcm-msg" id="${tid}">` +
      `<div class="qcm-av ai">${AGENTS[agent].orb}</div>` +
      `<div class="qcm-bub ai"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
    _scroll();

    history.push({ role:'user', content:text });
    try {
      const coords = await _getCoords();
      const r = await API.ai.chat({
        agentType: agent, message: text,
        ...(conversationId && { conversationId }),
        ...coords,
      });
      if (r.data.conversationId) conversationId = r.data.conversationId;
      history.push({ role:'assistant', content:r.data.reply });
      document.getElementById(tid)?.remove();
      _addMsg('ai', AGENTS[agent].orb, _fmt(r.data.reply));
      if (r.data.action) _renderAction(r.data.action);
      if (r.data.provider) {
        const pt = document.getElementById('qcmProvider');
        if (pt) pt.textContent = r.data.provider;
      }
    } catch(e) {
      document.getElementById(tid)?.remove();
      _addMsg('ai', '⚠️',
        `<span style="color:var(--red)">${e.message || 'Erro no Motor Quântico.'}</span>`);
    }
    _scroll();
    busy = false;
    if (btn) btn.disabled = false;
    document.getElementById('qcmTextarea')?.focus();
  }

  function _addMsg(type, icon, html) {
    const area  = document.getElementById('qcmMsgs');
    if (!area) return;
    const isUser = type === 'user';
    area.innerHTML +=
      `<div class="qcm-msg${isUser?' user':''}">` +
      `<div class="qcm-av ${isUser?'usr':'ai'}">${icon}</div>` +
      `<div class="qcm-bub ${isUser?'usr':'ai'}">${html}</div></div>`;
    _scroll();
  }

  function _scroll() {
    const a = document.getElementById('qcmMsgs');
    if (a) setTimeout(() => { a.scrollTop = a.scrollHeight; }, 50);
  }

  function _fmt(t) {
    return t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function _esc(t) {
    return String(t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _greeting(id) {
    const g = {
      orquestrador: 'Tenho 9 agentes especializados prontos. Como posso ajudar? 🚗',
      compra:       'Me diga o veículo que quer avaliar — modelo, ano e km. 🚗',
      pecas:        'Descreva o sintoma exato ou a peça que precisa. 🔧',
      aluguel:      'Onde e quando precisa do veículo? 🗝️',
      servico:      'Descreva o problema e a cidade. Vou estimar o custo. 🛠️',
      seguro:       'Me diga o veículo, CEP e sua idade para calcular o risco. 🛡️',
      financiamento:'Me diga o valor do veículo e sua renda líquida. 💰',
      reboque:      '🚨 Há feridos? Se sim, SAMU 192 imediatamente. Descreva sua situação.',
      chaveiro:     'Me diga o modelo do veículo e o problema. 🔑',
    };
    return g[id] || 'Como posso ajudar?';
  }

  // RENDERIZACAO DE ACOES REAIS (resultado de chatActions.js no backend)
  function _renderAction(action) {
    const area = document.getElementById('qcmMsgs');
    if (!area || !action?.type) return;

    let html = '';
    if (action.type === 'EMERGENCY_CREATED') {
      html = `
        <div class="action-card action-card--ok">
          <div class="action-card-icon">✅</div>
          <div class="action-card-body">
            <strong>Emergencia registrada</strong>
            <p>Buscando o prestador mais proximo automaticamente...</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('gps-tracking')">Acompanhar</button>
        </div>`;
    } else if (action.type === 'NEEDS_LOCATION') {
      html = `
        <div class="action-card action-card--warn">
          <div class="action-card-icon">📍</div>
          <div class="action-card-body">
            <strong>Localizacao necessaria</strong>
            <p>Permita o acesso a localizacao para que possamos acionar um prestador de verdade.</p>
          </div>
          <button class="action-card-btn" onclick="HomeChat.retryWithLocation()">Permitir e tentar de novo</button>
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
            <p>Parceiros cadastrados proximos da sua localizacao.</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('${targetRoute}')">Ver opcoes</button>
        </div>`
        : `
        <div class="action-card action-card--info">
          <div class="action-card-icon">ℹ️</div>
          <div class="action-card-body">
            <strong>Nenhum parceiro cadastrado nessa regiao ainda</strong>
            <p>Posso te dar orientacoes gerais enquanto isso.</p>
          </div>
        </div>`;
    } else if (action.type === 'OPEN_PARTS_QUOTE_FORM') {
      html = `
        <div class="action-card action-card--info">
          <div class="action-card-icon">🔧</div>
          <div class="action-card-body">
            <strong>Cotacao real de peca</strong>
            <p>Preencha marca, modelo e a peca para um preco de verdade.</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('pecas')">Abrir formulario</button>
        </div>`;
    } else if (action.type === 'OPEN_LOGISTICS_QUOTE_FORM') {
      html = `
        <div class="action-card action-card--info">
          <div class="action-card-icon">🚚</div>
          <div class="action-card-body">
            <strong>Cotacao real de frete</strong>
            <p>Preencha origem, destino e tipo de veiculo para um preco de verdade.</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('fretes')">Abrir formulario</button>
        </div>`;
    } else if (action.type === 'OPEN_INSURANCE_QUOTE_FORM') {
      html = `
        <div class="action-card action-card--info">
          <div class="action-card-icon">🛡️</div>
          <div class="action-card-body">
            <strong>Simulacao real de seguro</strong>
            <p>Preencha os dados do veiculo e do condutor para uma simulacao de verdade.</p>
          </div>
          <button class="action-card-btn" onclick="App.navigate('seguros-sim')">Abrir formulario</button>
        </div>`;
    }

    if (html) {
      area.innerHTML += `<div class="qcm-msg">${html}</div>`;
      _scroll();
    }
  }

  // Reenvia a ultima mensagem do usuario depois que ele autorizar GPS
  function retryWithLocation() {
    const msgs = history.filter(m => m.role === 'user');
    const last = msgs[msgs.length - 1]?.content;
    if (!last) return;
    const inp = document.getElementById('qcmTextarea');
    if (inp) { inp.value = last; send(); }
  }

  return { init, reset, selectAgent, inject, key, send, retryWithLocation };
})();
