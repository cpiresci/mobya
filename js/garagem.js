// ============================================================
// MOBYA — garagem.js  (Garagem de Veículos)
// Depende de: api.js, auth.js, app.js (Toast)
// ============================================================

window.Garagem = (() => {

  const TYPE_LABELS = {
    CAR:'🚗 Carro', MOTORCYCLE:'🏍️ Moto', TRUCK:'🚚 Caminhão',
    VAN:'🚐 Van', BUS:'🚌 Ônibus', OTHER:'🔧 Outro',
  };
  const FUEL_LABELS = {
    FLEX:'Flex', GASOLINE:'Gasolina', ETHANOL:'Etanol',
    DIESEL:'Diesel', ELECTRIC:'Elétrico', HYBRID:'Híbrido', GNV:'GNV',
  };
  const TRANSM_LABELS = {
    MANUAL:'Manual', AUTOMATIC:'Automático', CVT:'CVT', AUTOMATED:'Automatizado',
  };

  let _cache = {};

  // ── helpers ────────────────────────────────────────────────
  const fmtBRL  = v => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fmtNum  = v => parseInt(v||0).toLocaleString('pt-BR');
  const escHtml = t => String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const main    = () => document.getElementById('main');

  function pageHeader(title, subtitle) {
    return `<div style="margin-bottom:4px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:4px;
        background:linear-gradient(135deg,#fff,var(--q3),var(--neon));
        -webkit-background-clip:text;-webkit-text-fill-color:transparent">${title}</div>
      ${subtitle?`<div style="color:var(--muted);font-size:.84rem;margin-top:4px">${subtitle}</div>`:''}
    </div>`;
  }

  function skeleton(rows=3) {
    return Array(rows).fill(0).map((_,i)=>`
      <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
        padding:18px;animation:pulse 2s infinite;animation-delay:${i*.12}s">
        <div style="height:10px;background:var(--s3);border-radius:4px;margin-bottom:10px;width:${40+i*15}%"></div>
        <div style="height:22px;background:var(--s3);border-radius:4px;width:${60+i*10}%"></div>
      </div>`).join('');
  }

  function field(id,label,type,val,ph) {
    const v = (val!==undefined && val!==null) ? String(val).replace(/"/g,'&quot;') : '';
    return `<div class="form-field"><label style="font-size:.72rem;color:var(--muted);
      font-family:'JetBrains Mono',monospace;letter-spacing:1px;display:block;margin-bottom:5px">${label.toUpperCase()}</label>
      <input id="${id}" type="${type}" value="${v}" placeholder="${ph||''}" style="width:100%;
      background:var(--s3);border:1px solid var(--border);color:var(--text);padding:9px 13px;
      border-radius:8px;font-size:.82rem;outline:none"></div>`;
  }

  function selectField(id,label,optsMap,selected) {
    return `<div class="form-field"><label style="font-size:.72rem;color:var(--muted);
      font-family:'JetBrains Mono',monospace;letter-spacing:1px;display:block;margin-bottom:5px">${label.toUpperCase()}</label>
      <select id="${id}" style="width:100%;background:var(--s3);border:1px solid var(--border);
      color:var(--text);padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none">
      ${Object.entries(optsMap).map(([k,l])=>`<option value="${k}" ${k===selected?'selected':''}>${l}</option>`).join('')}
      </select></div>`;
  }

  // ── card de veículo (grid) ───────────────────────────────────
  function vehicleCard(v) {
    const icon = (TYPE_LABELS[v.vehicleType]||'🚗').split(' ')[0];
    return `<div onclick="Garagem.openDetail('${v.id}')" style="background:var(--s2);
      border:1px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;
      transition:border-color .15s" onmouseover="this.style.borderColor='var(--border2)'"
      onmouseout="this.style.borderColor='var(--border)'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div style="font-size:1.8rem">${icon}</div>
        ${v.plate?`<span style="font-family:'JetBrains Mono',monospace;font-size:.68rem;
          background:var(--s3);padding:3px 8px;border-radius:4px;color:var(--muted)">${escHtml(v.plate)}</span>`:''}
      </div>
      <div style="font-weight:700;font-size:.95rem;margin-bottom:2px">${escHtml(v.brand)} ${escHtml(v.model)}</div>
      <div style="color:var(--muted);font-size:.78rem;margin-bottom:10px">${escHtml(v.version||'')}${v.version?' · ':''}${v.modelYear}</div>
      <div style="display:flex;justify-content:space-between;font-size:.74rem;color:var(--muted)">
        <span>🛣️ ${fmtNum(v.mileage)} km</span>
        <span>${FUEL_LABELS[v.fuelType]||v.fuelType}</span>
      </div>
    </div>`;
  }

  // ── lista principal ──────────────────────────────────────────
  async function render() {
    const el = main();
    if (!el) return;
    if (!API.isAuth()) {
      el.innerHTML = `<div style="text-align:center;padding:64px">
        <div style="font-size:3rem;margin-bottom:16px">🔒</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--muted)">ACESSO RESTRITO</div>
        <div style="font-size:.84rem;color:var(--muted);margin:12px 0 24px">Faça login para acessar sua garagem.</div>
        <button onclick="window.MobyaAuth?.showLogin()" style="
          background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;
          padding:12px 28px;border-radius:8px;font-weight:700;border:none;cursor:pointer">
          ENTRAR
        </button>
      </div>`; return;
    }

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;
        margin-bottom:24px;flex-wrap:wrap;gap:12px">
        ${pageHeader('MINHA GARAGEM','Seus veículos, documentos e histórico de manutenções')}
        <button onclick="Garagem.showVehicleForm()" style="
          background:linear-gradient(135deg,var(--q1),var(--q3));color:#fff;padding:11px 20px;
          border-radius:8px;font-weight:700;border:none;cursor:pointer;font-size:.82rem;
          white-space:nowrap;height:42px">+ ADICIONAR VEÍCULO</button>
      </div>
      <div id="garagemList" class="grid-auto">${skeleton(3)}</div>`;

    await loadList();
  }

  async function loadList() {
    const cont = document.getElementById('garagemList');
    if (!cont) return;
    try {
      const r = await API.vehicle.list();
      const vehicles = r?.data || [];
      _cache = {};
      vehicles.forEach(v => _cache[v.id] = v);
      cont.innerHTML = vehicles.length
        ? vehicles.map(vehicleCard).join('')
        : `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)">
            <div style="font-size:2.4rem;margin-bottom:12px">🚗</div>
            Nenhum veículo cadastrado ainda.<br>
            <button onclick="Garagem.showVehicleForm()" style="background:none;color:var(--q4);
              border:none;cursor:pointer;font-weight:600;margin-top:10px">+ Cadastrar primeiro veículo</button>
          </div>`;
    } catch(e) {
      cont.innerHTML = `<div style="color:var(--red);padding:24px;grid-column:1/-1">⚠️ ${e.message}</div>`;
    }
  }

  // ── detalhe + manutenções ────────────────────────────────────
  function maintItem(m) {
    return `<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
      padding:14px 16px;margin-bottom:8px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <div style="font-weight:600;font-size:.86rem">${escHtml(m.type)}</div>
        <div style="color:var(--muted);font-size:.78rem;margin-top:2px">${escHtml(m.description)}</div>
        ${m.workshop?`<div style="color:var(--muted);font-size:.72rem;margin-top:2px">📍 ${escHtml(m.workshop)}</div>`:''}
      </div>
      <div style="text-align:right;white-space:nowrap">
        <div style="font-family:'JetBrains Mono',monospace;font-size:.72rem;color:var(--muted)">${new Date(m.date).toLocaleDateString('pt-BR')}</div>
        <div style="font-size:.76rem;color:var(--muted)">${fmtNum(m.mileage)} km</div>
        ${m.cost?`<div style="font-weight:700;font-size:.82rem;color:var(--green);margin-top:2px">${fmtBRL(m.cost)}</div>`:''}
      </div>
    </div>`;
  }

  async function openDetail(id) {
    const el = main();
    if (!el) return;
    el.innerHTML = `${skeleton(3)}`;
    try {
      const r = await API.vehicle.get(id);
      const v = r.data;
      _cache[v.id] = v;
      const maints = v.maintenances || [];
      el.innerHTML = `
        <button onclick="Garagem.render()" style="background:none;border:none;color:var(--muted);
          cursor:pointer;font-size:.82rem;margin-bottom:16px">← Voltar à garagem</button>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;
          gap:12px;margin-bottom:24px">
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:3px;
              background:linear-gradient(135deg,#fff,var(--q3),var(--neon));-webkit-background-clip:text;
              -webkit-text-fill-color:transparent">${escHtml(v.brand)} ${escHtml(v.model)}</div>
            <div style="color:var(--muted);font-size:.84rem;margin-top:4px">${escHtml(v.version||'')}
              ${v.version?' · ':''}${v.year}/${v.modelYear}${v.plate?' · Placa '+escHtml(v.plate):''}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="Garagem.showVehicleForm('${v.id}')" style="background:var(--s2);
              border:1px solid var(--border);color:var(--text);padding:9px 16px;border-radius:8px;
              font-size:.78rem;cursor:pointer">✏️ Editar</button>
            <button onclick="Garagem.deleteVehicle('${v.id}')" style="background:rgba(239,68,68,.1);
              border:1px solid rgba(239,68,68,.3);color:#ef4444;padding:9px 16px;border-radius:8px;
              font-size:.78rem;cursor:pointer">🗑️ Remover</button>
          </div>
        </div>

        <div class="grid-4" style="margin-bottom:24px">
          ${[
            {label:'QUILOMETRAGEM', value:fmtNum(v.mileage)+' km'},
            {label:'COMBUSTÍVEL',   value:FUEL_LABELS[v.fuelType]||v.fuelType},
            {label:'TRANSMISSÃO',   value:TRANSM_LABELS[v.transmission]||v.transmission},
            {label:'COR',           value:v.color?escHtml(v.color):'—'},
          ].map(k=>`<div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;
            padding:14px;text-align:center">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--muted);
              margin-bottom:6px">${k.label}</div>
            <div style="font-weight:700;font-size:.92rem">${k.value}</div>
          </div>`).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:2px;
            color:var(--q4)">🔧 HISTÓRICO DE MANUTENÇÕES</div>
          <button onclick="Garagem.showMaintenanceForm('${v.id}')" style="background:none;color:var(--neon);
            border:none;cursor:pointer;font-size:.78rem;font-weight:600">+ Registrar manutenção</button>
        </div>
        <div id="maintList">
          ${maints.length ? maints.map(maintItem).join('') :
            `<div style="color:var(--muted);font-size:.82rem;padding:24px;text-align:center;
              background:var(--s2);border:1px solid var(--border);border-radius:10px">
              Nenhuma manutenção registrada ainda.</div>`}
        </div>
      `;
    } catch(e) {
      el.innerHTML = `<div style="color:var(--red);padding:32px">⚠️ ${e.message}</div>
        <button onclick="Garagem.render()" style="background:var(--s2);border:1px solid var(--border);
          color:var(--text);padding:9px 16px;border-radius:8px;cursor:pointer">← Voltar</button>`;
    }
  }

  // ── form criar/editar veículo (modal) ────────────────────────
  function showVehicleForm(id=null) {
    const modals = document.getElementById('modals');
    if (!modals) return;
    const v = id ? _cache[id] : null;
    modals.innerHTML = `
      <div style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.75);
        backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px" id="vehModal">
        <div style="background:var(--s2);border:1px solid var(--border2);border-radius:16px;
          padding:32px;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;position:relative">
          <button onclick="document.getElementById('vehModal').remove()" style="
            position:absolute;top:16px;right:16px;background:none;border:none;
            color:var(--muted);font-size:1.2rem;cursor:pointer">✕</button>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:3px;
            margin-bottom:20px">${v?'EDITAR VEÍCULO':'NOVO VEÍCULO'}</div>
          <div id="vehFormErr" class="callout error" style="display:none"></div>

          <div class="grid-2">
            ${field('vBrand','Marca *','text',v?.brand,'Ex: Honda')}
            ${field('vModel','Modelo *','text',v?.model,'Ex: Civic')}
          </div>
          ${field('vVersion','Versão','text',v?.version,'Ex: EXL 2.0')}
          <div class="grid-2">
            ${field('vYear','Ano de fabricação *','number',v?.year,'Ex: 2022')}
            ${field('vModelYear','Ano do modelo *','number',v?.modelYear,'Ex: 2023')}
          </div>
          <div class="grid-2">
            ${field('vColor','Cor','text',v?.color,'Ex: Preto')}
            ${field('vPlate','Placa','text',v?.plate,'ABC1D23')}
          </div>
          <div class="grid-2">
            ${selectField('vType','Tipo', TYPE_LABELS, v?.vehicleType||'CAR')}
            ${selectField('vFuel','Combustível', FUEL_LABELS, v?.fuelType||'FLEX')}
          </div>
          <div class="grid-2">
            ${selectField('vTransmission','Transmissão', TRANSM_LABELS, v?.transmission||'MANUAL')}
            ${field('vMileage','Quilometragem','number',v?.mileage??0,'0')}
          </div>
          ${field('vFipeValue','Valor FIPE (R$) — opcional','number',v?.fipeValue,'0.00')}

          <button onclick="Garagem.submitVehicleForm(${v?`'${v.id}'`:'null'})" class="ai-btn"
            style="width:100%;justify-content:center;height:44px;margin-top:10px">
            <div class="pdot"></div>${v?'SALVAR ALTERAÇÕES':'CADASTRAR VEÍCULO'}
          </button>
        </div>
      </div>`;
    setTimeout(()=>document.getElementById('vBrand')?.focus(),100);
  }

  async function submitVehicleForm(id) {
    const errEl = document.getElementById('vehFormErr');
    const val = i => document.getElementById(i)?.value?.trim();
    const data = {
      brand: val('vBrand'), model: val('vModel'), version: val('vVersion')||undefined,
      year: parseInt(val('vYear')), modelYear: parseInt(val('vModelYear')),
      color: val('vColor')||undefined,
      plate: val('vPlate') ? val('vPlate').toUpperCase() : undefined,
      vehicleType: val('vType'), fuelType: val('vFuel'), transmission: val('vTransmission'),
      mileage: parseInt(val('vMileage'))||0,
      fipeValue: val('vFipeValue') ? parseFloat(val('vFipeValue')) : undefined,
    };
    if (!data.brand || !data.model || !data.year || !data.modelYear) {
      if (errEl) { errEl.textContent = 'Preencha marca, modelo, ano de fabricação e ano do modelo.'; errEl.style.display = 'block'; }
      return;
    }
    const btn = document.querySelector('#vehModal .ai-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="pdot"></div>SALVANDO...'; }
    try {
      if (id) await API.vehicle.update(id, data);
      else await API.vehicle.create(data);
      document.getElementById('vehModal')?.remove();
      Toast.show(id ? 'Veículo atualizado! ✅' : 'Veículo cadastrado! ✅', 'ok');
      if (id) openDetail(id); else render();
    } catch(e) {
      if (errEl) { errEl.textContent = e.message || 'Erro ao salvar veículo.'; errEl.style.display = 'block'; }
      if (btn) { btn.disabled = false; btn.innerHTML = `<div class="pdot"></div>${id?'SALVAR ALTERAÇÕES':'CADASTRAR VEÍCULO'}`; }
    }
  }

  async function deleteVehicle(id) {
    if (!confirm('Remover este veículo? Esta ação não pode ser desfeita.')) return;
    try {
      await API.vehicle.remove(id);
      Toast.show('Veículo removido.', 'ok');
      render();
    } catch(e) {
      Toast.show(e.message || 'Erro ao remover veículo.', 'err');
    }
  }

  // ── form registrar manutenção (modal) ────────────────────────
  function showMaintenanceForm(vehicleId) {
    const modals = document.getElementById('modals');
    if (!modals) return;
    const today = new Date().toISOString().slice(0,10);
    modals.innerHTML = `
      <div style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.75);
        backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px" id="maintModal">
        <div style="background:var(--s2);border:1px solid var(--border2);border-radius:16px;
          padding:32px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;position:relative">
          <button onclick="document.getElementById('maintModal').remove()" style="
            position:absolute;top:16px;right:16px;background:none;border:none;
            color:var(--muted);font-size:1.2rem;cursor:pointer">✕</button>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:3px;
            margin-bottom:20px">NOVA MANUTENÇÃO</div>
          <div id="maintFormErr" class="callout error" style="display:none"></div>

          <div class="grid-2">
            ${field('mDate','Data *','date',today)}
            ${field('mMileage','Quilometragem *','number','','Ex: 45000')}
          </div>
          ${field('mType','Tipo de serviço *','text','','Ex: Troca de óleo')}
          <div class="form-field"><label style="font-size:.72rem;color:var(--muted);
            font-family:'JetBrains Mono',monospace;letter-spacing:1px;display:block;margin-bottom:5px">DESCRIÇÃO *</label>
            <textarea id="mDesc" rows="3" placeholder="Ex: Troca de óleo e filtro, revisão dos 45.000km"
              style="width:100%;background:var(--s3);border:1px solid var(--border);color:var(--text);
              padding:9px 13px;border-radius:8px;font-size:.82rem;outline:none"></textarea></div>
          <div class="grid-2">
            ${field('mCost','Custo (R$)','number','','0.00')}
            ${field('mWorkshop','Oficina/local','text','','Ex: Oficina do Zé')}
          </div>

          <button onclick="Garagem.submitMaintenanceForm('${vehicleId}')" class="ai-btn"
            style="width:100%;justify-content:center;height:44px;margin-top:10px">
            <div class="pdot"></div>REGISTRAR
          </button>
        </div>
      </div>`;
    setTimeout(()=>document.getElementById('mMileage')?.focus(),100);
  }

  async function submitMaintenanceForm(vehicleId) {
    const errEl = document.getElementById('maintFormErr');
    const val = i => document.getElementById(i)?.value?.trim();
    const data = {
      date: val('mDate'), mileage: parseInt(val('mMileage')),
      type: val('mType'), description: val('mDesc'),
      cost: val('mCost') ? parseFloat(val('mCost')) : undefined,
      workshop: val('mWorkshop') || undefined,
    };
    if (!data.date || !data.mileage || !data.type || !data.description) {
      if (errEl) { errEl.textContent = 'Preencha data, km, tipo e descrição.'; errEl.style.display = 'block'; }
      return;
    }
    const btn = document.querySelector('#maintModal .ai-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="pdot"></div>SALVANDO...'; }
    try {
      await API.vehicle.addMaintenance(vehicleId, data);
      document.getElementById('maintModal')?.remove();
      Toast.show('Manutenção registrada! ✅', 'ok');
      openDetail(vehicleId);
    } catch(e) {
      if (errEl) { errEl.textContent = e.message || 'Erro ao registrar manutenção.'; errEl.style.display = 'block'; }
      if (btn) { btn.disabled = false; btn.innerHTML = '<div class="pdot"></div>REGISTRAR'; }
    }
  }

  return {
    render, openDetail, showVehicleForm, submitVehicleForm,
    deleteVehicle, showMaintenanceForm, submitMaintenanceForm,
  };
})();
