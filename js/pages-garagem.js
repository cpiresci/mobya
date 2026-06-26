// ============================================================
// MOBYA — pages-garagem.js
// Página: Minha Garagem (CRUD de veículos + manutenções)
// Carregar APÓS pages-extra.js e api.js no index.html
// Estende window.Pages (não cria namespace próprio) porque o
// roteador BASE_PAGES chama Pages.renderGaragem().
// ============================================================

(function () {

  const main = () => document.getElementById('main');
  const fmtKm = v => `${parseInt(v || 0).toLocaleString('pt-BR')} km`;
  const fmtBRL = v => v == null ? '—' : `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  let _vehicles = [];
  let _openId = null; // veículo expandido (mostrando manutenções)

  // ── PÁGINA PRINCIPAL ─────────────────────────────────────────
  async function renderGaragem() {
    const el = main(); if (!el) return;
    if (!API.isAuth()) {
      window.App?.toast?.('Faça login para acessar sua garagem.', 'warn');
      window.MobyaAuth?.showLogin();
      return;
    }
    el.innerHTML = `
<div class="px-extra">
  <div class="px-hero px-hero--blue">
    <div class="px-hero-icon">🚗</div>
    <div>
      <div class="px-hero-title">MINHA GARAGEM</div>
      <div class="px-hero-sub">Seus veículos, documentos e histórico de manutenção</div>
    </div>
  </div>

  <button class="px-btn" onclick="Pages.gShowForm()">➕ ADICIONAR VEÍCULO</button>

  <div id="gFormWrap" style="display:none;margin-top:16px"></div>

  <div class="px-card-title" style="margin:24px 0 12px">SEUS VEÍCULOS</div>
  <div id="gList"><div style="color:var(--muted,#888);font-size:.85rem;padding:12px 0">Carregando...</div></div>
</div>`;
    await _loadVehicles();
  }

  async function _loadVehicles() {
    const list = document.getElementById('gList'); if (!list) return;
    try {
      const r = await API.vehicle.list();
      _vehicles = r.data || [];
      list.innerHTML = _vehicles.length ? _vehicles.map(_vehicleCard).join('') : `
        <div class="px-card" style="text-align:center;color:var(--muted,#888);font-size:.85rem">
          Nenhum veículo cadastrado ainda. Adicione o primeiro acima.
        </div>`;
    } catch (e) {
      list.innerHTML = `<div class="px-card" style="color:#ef4444;font-size:.85rem">Não foi possível carregar seus veículos agora.</div>`;
    }
  }

  function _vehicleCard(v) {
    const isOpen = _openId === v.id;
    return `
    <div class="px-card g-vcard">
      <div class="g-vtop" onclick="Pages.gToggle('${v.id}')">
        <div>
          <div class="g-vname">${v.brand} ${v.model} <span class="g-vyear">${v.modelYear || v.year || ''}</span></div>
          <div class="g-vmeta">${v.plate || 'Sem placa'} · ${fmtKm(v.mileage)} ${v.color ? '· ' + v.color : ''}</div>
        </div>
        <div class="g-vchev">${isOpen ? '▲' : '▼'}</div>
      </div>
      ${isOpen ? _vehicleDetail(v) : ''}
    </div>`;
  }

  function _vehicleDetail(v) {
    return `
    <div class="g-vdetail">
      <div class="g-vgrid">
        <div><span>Versão</span><strong>${v.version || '—'}</strong></div>
        <div><span>Combustível</span><strong>${v.fuelType || '—'}</strong></div>
        <div><span>Câmbio</span><strong>${v.transmission || '—'}</strong></div>
        <div><span>Chassi</span><strong>${v.chassis || '—'}</strong></div>
        <div><span>FIPE</span><strong>${v.fipeValue ? fmtBRL(v.fipeValue) : '—'}</strong></div>
      </div>
      <div class="g-vactions">
        <button class="px-btn px-btn--sm" onclick="Pages.gAddMaintenance('${v.id}')">🔧 Registrar manutenção</button>
        <button class="px-btn px-btn--sm px-btn--rental" onclick="Pages.gAtivarAluguel('${v.id}')">🗝️ Disponibilizar para Aluguel</button>
        <button class="px-btn px-btn--sm px-btn--ghost" onclick="Pages.gRemove('${v.id}')">🗑️ Remover</button>
      </div>
      <div class="g-maint-title">Histórico de manutenção</div>
      <div id="gMaint-${v.id}">${_maintList(v.maintenances)}</div>
    </div>`;
  }

  function _maintList(items) {
    if (!items || !items.length) return `<div style="color:var(--muted,#888);font-size:.78rem;padding:6px 0">Nenhuma manutenção registrada.</div>`;
    return items.map(m => `
      <div class="g-maint-item">
        <div><strong>${m.type}</strong> — ${m.description}</div>
        <div class="g-maint-sub">${new Date(m.date).toLocaleDateString('pt-BR')} · ${fmtKm(m.mileage)} ${m.cost ? '· ' + fmtBRL(m.cost) : ''} ${m.workshop ? '· ' + m.workshop : ''}</div>
      </div>`).join('');
  }

  async function gToggle(id) {
    if (_openId === id) { _openId = null; await _loadVehicles(); return; }
    try {
      const r = await API.vehicle.get(id);
      const idx = _vehicles.findIndex(v => v.id === id);
      if (idx >= 0) _vehicles[idx] = r.data;
      _openId = id;
      const list = document.getElementById('gList');
      if (list) list.innerHTML = _vehicles.map(_vehicleCard).join('');
    } catch (e) {
      Toast?.show(e.message || 'Não foi possível carregar os detalhes do veículo.', 'err');
    }
  }

  // ── FORMULÁRIO: NOVO VEÍCULO ─────────────────────────────────
  function gShowForm() {
    const wrap = document.getElementById('gFormWrap'); if (!wrap) return;
    wrap.style.display = 'block';
    wrap.innerHTML = `
    <div class="px-card">
      <div class="px-card-title">◈ NOVO VEÍCULO</div>
      <div class="pm-form">
        <div class="pm-field"><label>Marca *</label><input class="px-input" id="gBrand" placeholder="Ex: Toyota"></div>
        <div class="pm-field"><label>Modelo *</label><input class="px-input" id="gModel" placeholder="Ex: Corolla"></div>
        <div class="pm-field"><label>Versão</label><input class="px-input" id="gVersion" placeholder="Ex: XEi 2.0"></div>
        <div class="pm-field"><label>Ano fabricação *</label><input class="px-input" type="number" id="gYear" placeholder="2020"></div>
        <div class="pm-field"><label>Ano modelo *</label><input class="px-input" type="number" id="gModelYear" placeholder="2021"></div>
        <div class="pm-field"><label>Cor</label><input class="px-input" id="gColor" placeholder="Ex: Preto"></div>
        <div class="pm-field"><label>Placa</label><input class="px-input" id="gPlate" placeholder="ABC1D23" maxlength="8"></div>
        <div class="pm-field"><label>Quilometragem atual</label><input class="px-input" type="number" id="gMileage" placeholder="0"></div>
        <div class="pm-field">
          <label>Combustível</label>
          <select class="px-input" id="gFuel">
            <option value="">—</option><option value="FLEX">Flex</option><option value="GASOLINE">Gasolina</option><option value="ETHANOL">Etanol</option><option value="DIESEL">Diesel</option><option value="ELECTRIC">Elétrico</option><option value="HYBRID">Híbrido</option><option value="GNV">GNV</option>
          </select>
        </div>
        <div class="pm-field">
          <label>Câmbio</label>
          <select class="px-input" id="gTrans">
            <option value="">—</option><option value="MANUAL">Manual</option><option value="AUTOMATIC">Automático</option><option value="CVT">CVT</option><option value="AUTOMATED">Automatizado</option>
          </select>
        </div>
      </div>
      <div class="g-vactions">
        <button class="px-btn" onclick="Pages.gSaveVehicle()">💾 Salvar veículo</button>
        <button class="px-btn px-btn--ghost" onclick="document.getElementById('gFormWrap').style.display='none'">Cancelar</button>
      </div>
    </div>`;
    wrap.scrollIntoView({ behavior: 'smooth' });
  }

  async function gSaveVehicle() {
    const brand = document.getElementById('gBrand')?.value.trim();
    const model = document.getElementById('gModel')?.value.trim();
    const year = parseInt(document.getElementById('gYear')?.value);
    const modelYear = parseInt(document.getElementById('gModelYear')?.value);
    if (!brand || !model || !year || !modelYear) {
      Toast?.show('Marca, modelo, ano de fabricação e ano modelo são obrigatórios.', 'err');
      return;
    }
    const payload = {
      brand, model, year, modelYear,
      version: document.getElementById('gVersion')?.value.trim() || undefined,
      color: document.getElementById('gColor')?.value.trim() || undefined,
      plate: document.getElementById('gPlate')?.value.trim().toUpperCase() || undefined,
      mileage: parseInt(document.getElementById('gMileage')?.value) || 0,
      fuelType: document.getElementById('gFuel')?.value || undefined,
      transmission: document.getElementById('gTrans')?.value || undefined,
    };
    try {
      await API.vehicle.create(payload);
      Toast?.show('🚗 Veículo cadastrado!', 'ok');
      document.getElementById('gFormWrap').style.display = 'none';
      await _loadVehicles();
    } catch (e) {
      Toast?.show(e.message || 'Não foi possível cadastrar o veículo agora.', 'err');
    }
  }

  async function gRemove(id) {
    if (!confirm('Remover este veículo e todo o histórico de manutenção?')) return;
    try {
      await API.vehicle.remove(id);
      Toast?.show('Veículo removido.', 'ok');
      _openId = null;
      await _loadVehicles();
    } catch (e) {
      Toast?.show(e.message || 'Não foi possível remover o veículo agora.', 'err');
    }
  }

  // ── MANUTENÇÃO ────────────────────────────────────────────────
  function gAddMaintenance(vehicleId) {
    const target = document.getElementById(`gMaint-${vehicleId}`); if (!target) return;
    target.insertAdjacentHTML('beforebegin', `
      <div class="px-card" id="gMaintForm-${vehicleId}" style="margin-top:10px;background:rgba(255,255,255,.03)">
        <div class="pm-form">
          <div class="pm-field"><label>Data *</label><input class="px-input" type="date" id="gmDate-${vehicleId}"></div>
          <div class="pm-field"><label>Quilometragem *</label><input class="px-input" type="number" id="gmKm-${vehicleId}"></div>
          <div class="pm-field"><label>Tipo *</label><input class="px-input" id="gmType-${vehicleId}" placeholder="Ex: Troca de óleo"></div>
          <div class="pm-field"><label>Descrição *</label><input class="px-input" id="gmDesc-${vehicleId}" placeholder="Detalhes do serviço"></div>
          <div class="pm-field"><label>Custo</label><input class="px-input" type="number" id="gmCost-${vehicleId}" placeholder="R$"></div>
          <div class="pm-field"><label>Oficina</label><input class="px-input" id="gmShop-${vehicleId}" placeholder="Nome da oficina"></div>
        </div>
        <div class="g-vactions">
          <button class="px-btn px-btn--sm" onclick="Pages.gSaveMaintenance('${vehicleId}')">💾 Salvar</button>
          <button class="px-btn px-btn--sm px-btn--ghost" onclick="document.getElementById('gMaintForm-${vehicleId}').remove()">Cancelar</button>
        </div>
      </div>`);
  }

  async function gSaveMaintenance(vehicleId) {
    const date = document.getElementById(`gmDate-${vehicleId}`)?.value;
    const mileage = parseInt(document.getElementById(`gmKm-${vehicleId}`)?.value);
    const type = document.getElementById(`gmType-${vehicleId}`)?.value.trim();
    const description = document.getElementById(`gmDesc-${vehicleId}`)?.value.trim();
    if (!date || !mileage || !type || !description) {
      Toast?.show('Data, quilometragem, tipo e descrição são obrigatórios.', 'err');
      return;
    }
    const cost = document.getElementById(`gmCost-${vehicleId}`)?.value;
    const workshop = document.getElementById(`gmShop-${vehicleId}`)?.value.trim();
    try {
      await API.vehicle.addMaintenance(vehicleId, {
        date, mileage, type, description,
        cost: cost ? parseFloat(cost) : undefined,
        workshop: workshop || undefined,
      });
      Toast?.show('🔧 Manutenção registrada!', 'ok');
      document.getElementById(`gMaintForm-${vehicleId}`)?.remove();
      // recarrega os dados do veículo (com a manutenção nova) mantendo-o aberto
      const r = await API.vehicle.get(vehicleId);
      const idx = _vehicles.findIndex(v => v.id === vehicleId);
      if (idx >= 0) _vehicles[idx] = r.data;
      const maintEl = document.getElementById(`gMaint-${vehicleId}`);
      if (maintEl) maintEl.innerHTML = _maintList(r.data.maintenances);
    } catch (e) {
      Toast?.show(e.message || 'Não foi possível registrar a manutenção agora.', 'err');
    }
  }


  async function gAtivarAluguel(vehicleId) {
    if (!API.isAuth()) { MobyaAuth.showLogin(); return; }
    try {
      const r = await API.rental.myConfigs({ limit: 50 });
      const configs = r?.data || [];
      const jaAtivo = configs.find(c => c.vehicleId === vehicleId);
      if (jaAtivo) {
        if (confirm('Veiculo ja disponivel para aluguel. Ir para o Painel Anfitriao?')) App.navigate('painel-anfitriao');
        return;
      }
    } catch(e) {}
    window.__mobyaRentalVehicleId = vehicleId;
    App.navigate('painel-anfitriao');
    App.toast('Configure os detalhes do aluguel no painel abaixo.', 'info', 5000);
  }
  // ── EXPÕE NO window.Pages (objeto já criado por pages.js) ────
  window.Pages = window.Pages || {};
  Object.assign(window.Pages, {
    renderGaragem, gShowForm, gSaveVehicle, gToggle, gRemove, gAddMaintenance, gSaveMaintenance, gAtivarAluguel,
  });

  // ── CSS ───────────────────────────────────────────────────────
  if (!document.getElementById('px-style-pages-garagem')) {
    const style = document.createElement('style');
    style.id = 'px-style-pages-garagem';
    style.textContent = `
.px-hero--blue{background:linear-gradient(135deg,rgba(37,99,235,.25),rgba(59,130,246,.1));border:1px solid rgba(59,130,246,.3)}
.g-vcard{cursor:default}
.g-vtop{display:flex;justify-content:space-between;align-items:center;cursor:pointer}
.g-vname{font-weight:700;color:#fff;font-size:.95rem}
.g-vyear{color:var(--muted,#888);font-weight:400;font-size:.82rem}
.g-vmeta{font-size:.78rem;color:var(--muted,#888);margin-top:3px}
.g-vchev{color:var(--muted,#888);font-size:.8rem}
.g-vdetail{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}
.g-vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:14px}
.g-vgrid div{display:flex;flex-direction:column;gap:2px}
.g-vgrid span{font-size:.72rem;color:var(--muted,#888)}
.g-vgrid strong{font-size:.84rem;color:#fff}
.g-vactions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.px-btn--ghost{background:transparent;border:1px solid rgba(255,255,255,.15);color:var(--muted,#888)}
.px-btn--rental{background:rgba(6,182,212,.12);border:1px solid rgba(6,182,212,.35);color:#06b6d4}
.g-maint-title{font-size:.8rem;font-weight:700;color:var(--muted,#888);margin:14px 0 8px;text-transform:uppercase;letter-spacing:.5px}
.g-maint-item{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.82rem;color:#fff}
.g-maint-sub{font-size:.74rem;color:var(--muted,#888);margin-top:2px}
    `;
    document.head.appendChild(style);
  }

})();
