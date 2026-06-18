window.HomeChat = (() => {
  let agent = 'orquestrador';
  let history = [];
  let busy = false;
  let conversationId = null;
  let initialized = false;

  const AGENTS = {
    orquestrador: { name:'NEXUS-CORE', orb:'⬡', desc:'Orquestrador · 9 agentes ativos',
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

  function init() {
    if (initialized) return;
    initialized = true;
    agent = 'orquestrador';
    history = [];
    conversationId = null;
    busy = false;
    _renderChips();
    _renderExamples();
    _addMsg('ai', AGENTS[agent].orb, 'Olá! Sou o <strong>NEXUS-CORE</strong>, o orquestrador quântico da MOBYA.<br>Tenho 9 agentes especializados prontos. Como posso ajudar hoje? 🚗');
  }

  function _renderChips() {
    const el = document.getElementById('qcmChips');
    if (!el) return;
    el.innerHTML = Object.entries(AGENTS).map(([id, ag]) =>
      '<div class="qcm-chip ' + (id===agent?'on':'') + '" onclick="HomeChat.selectAgent(\'' + id + '\',this)">' + ag.orb + ' ' + ag.name + '</div>'
    ).join('');
  }

  function _renderExamples() {
    const el = document.getElementById('qcmExamples');
    if (!el) return;
    const sugs = AGENTS[agent].sugs;
    el.innerHTML = sugs.map(s =>
      '<div class="qcm-ex" onclick="HomeChat.inject(\'' + s.q.replace(/'/g,"\\'") + '\')">' +
      '<span class="qcm-ex-ico">' + s.icon + '</span>' +
      '<span class="qcm-ex-txt">' + s.short + '</span>' +
      '</div>'
    ).join('');
  }

  function selectAgent(id, el) {
    document.querySelectorAll('.qcm-chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
    agent = id;
    history = [];
    conversationId = null;
    const a = AGENTS[id];
    const orb = document.getElementById('qcmOrb');
    const name = document.getElementById('qcmName');
    const desc = document.getElementById('qcmDesc');
    const prov = document.getElementById('qcmProvider');
    if (orb) orb.textContent = a.orb;
    if (name) name.textContent = a.name;
    if (desc) desc.textContent = a.desc;
    if (prov) prov.textContent = '-';
    const msgs = document.getElementById('qcmMsgs');
    if (msgs) msgs.innerHTML = '';
    _renderExamples();
    _addMsg('ai', a.orb, 'Sou o <strong>' + a.name + '</strong> — ' + a.desc + '.<br>' + _greeting(id));
  }

  function inject(text) {
    const inp = document.getElementById('qcmTextarea');
    if (inp) { inp.value = text; inp.dispatchEvent(new Event('input')); }
    send();
  }

  function key(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  async function send() {
    if (!API.isAuth()) { MobyaAuth.showLogin('chat'); return; }
    const inp  = document.getElementById('qcmTextarea');
    const text = inp?.value?.trim();
    if (!text || busy) return;
    busy = true;
    inp.value = '';
    inp.style.height = 'auto';
    document.getElementById('qcmSend').disabled = true;
    _addMsg('user', '👤', _esc(text));
    const ex = document.getElementById('qcmExamples');
    if (ex) ex.style.display = 'none';
    const tid = 'typing_' + Date.now();
    const msgs = document.getElementById('qcmMsgs');
    if (msgs) msgs.innerHTML += '<div class="qcm-msg" id="' + tid + '"><div class="qcm-av ai">' + AGENTS[agent].orb + '</div><div class="qcm-bub ai"><div class="typing"><span></span><span></span><span></span></div></div></div>';
    _scroll();
    history.push({ role: 'user', content: text });
    try {
      const r = await API.ai.chat({ agentType: agent, message: text, ...(conversationId && { conversationId }) });
      if (r.data.conversationId) conversationId = r.data.conversationId;
      history.push({ role: 'assistant', content: r.data.reply });
      document.getElementById(tid)?.remove();
      _addMsg('ai', AGENTS[agent].orb, _fmt(r.data.reply));
      if (r.data.provider) {
        const pt = document.getElementById('qcmProvider');
        if (pt) pt.textContent = r.data.provider;
      }
    } catch (e) {
      document.getElementById(tid)?.remove();
      _addMsg('ai', '⚠️', '<span style="color:var(--red)">' + (e.message || 'Erro no Motor Quântico.') + '</span>');
    }
    _scroll();
    busy = false;
    document.getElementById('qcmSend').disabled = false;
    document.getElementById('qcmTextarea')?.focus();
  }

  function _addMsg(type, icon, html) {
    const area = document.getElementById('qcmMsgs');
    if (!area) return;
    const isUser = type === 'user';
    area.innerHTML += '<div class="qcm-msg' + (isUser?' user':'') + '"><div class="qcm-av ' + (isUser?'usr':'ai') + '">' + icon + '</div><div class="qcm-bub ' + (isUser?'usr':'ai') + '">' + html + '</div></div>';
    _scroll();
  }

  function _scroll() {
    const a = document.getElementById('qcmMsgs');
    if (a) setTimeout(() => a.scrollTop = a.scrollHeight, 50);
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
    return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _greeting(id) {
    const g = {
      orquestrador:'Tenho 9 agentes especializados prontos. Como posso ajudar? 🚗',
      compra:'Me diga o veículo que quer avaliar — modelo, ano e km. 🚗',
      pecas:'Descreva o sintoma exato ou a peça que precisa. 🔧',
      aluguel:'Onde e quando precisa do veículo? 🗝️',
      servico:'Descreva o problema e a cidade. Vou estimar o custo. 🛠️',
      seguro:'Me diga o veículo, CEP e sua idade para calcular o risco. 🛡️',
      financiamento:'Me diga o valor do veículo e sua renda líquida. 💰',
      reboque:'🚨 Há feridos? Se sim, SAMU 192 imediatamente. Descreva sua situação.',
      chaveiro:'Me diga o modelo do veículo e o problema. 🔑',
    };
    return g[id] || 'Como posso ajudar?';
  }

  return { init, selectAgent, inject, key, send };
})();
