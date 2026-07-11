// js/plate-check.js
// ============================================================
// Frente H do master prompt (08/07/2026) — Consulta Oficial de Placa,
// acessível a partir da Home pra qualquer usuário, dono de anúncio ou não.
// Reaproveita 100% o backend pago da Frente A (webhook, PIX, Infosimples)
// via a rota standalone nova (vehicle-check-standalone.routes.js).
//
// Deliberadamente NÃO é o mesmo módulo/página do tile "Vistoria"
// (Pages.renderVistoria em pages.js), que é uma análise heurística de IA
// sem consulta real ao DETRAN. Esta página deixa isso explícito na cópia
// pra não confundir o usuário sobre o que está pagando.
// ============================================================
window.PlateCheck = (() => {
  let _pollTimer   = null;
  let _checkId     = null;
  let _amount      = null;
  let _placa       = null;

  const UFS = 'AC,AL,AP,AM,BA,CE,DF,ES,GO,MA,MT,MS,MG,PA,PB,PR,PE,PI,RJ,RN,RS,RO,RR,SC,SP,SE,TO'.split(',');

  function main() { return document.getElementById('main'); }

  // ── RENDER: tela inicial (form) ─────────────────────────────
  function render() {
    const el = main();
    if (!el) return;
    _stopPolling();

    el.innerHTML = `
      <div class="pc-wrap">
        <div class="pc-hero">
          <div class="pc-hero-badge">🛡️ CONSULTA OFICIAL · FONTE DETRAN</div>
          <h1 class="pc-hero-title">Descubra tudo sobre<br><em>qualquer placa</em> antes de fechar negócio.</h1>
          <p class="pc-hero-sub">Consulta oficial de restrições veiculares (furto/roubo, bloqueios, débitos)
            direto na base do DETRAN — não é estimativa de IA, é o dado real, o mesmo que uma vistoria
            cautelar usaria como ponto de partida.</p>
        </div>

        <div class="pc-card">
          <div class="pc-card-hd">
            <div class="pc-card-hd-ico">🔎</div>
            <div>
              <div class="pc-card-hd-ttl">Consultar placa agora</div>
              <div class="pc-card-hd-sub">Resultado em minutos após o pagamento via PIX</div>
            </div>
          </div>

          <form id="pcForm" onsubmit="return false">
            <div class="pc-field">
              <label>Placa</label>
              <input type="text" id="pcPlaca" maxlength="7" placeholder="ABC1D23" autocomplete="off"
                oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')">
            </div>
            <div class="pc-field">
              <label>Estado (UF)</label>
              <select id="pcUf">
                <option value="">Selecione…</option>
                ${UFS.map(uf => `<option value="${uf}">${uf}</option>`).join('')}
              </select>
            </div>

            <button type="button" id="pcToggleAdv" onclick="PlateCheck._toggleAdv()" class="pc-adv-toggle">
              + Renavam / Chassi (opcional, ajuda a precisão)
            </button>
            <div id="pcAdvFields" style="display:none">
              <div class="pc-field">
                <label>Renavam</label>
                <input type="text" id="pcRenavam" maxlength="11" placeholder="Opcional" autocomplete="off"
                  oninput="this.value=this.value.replace(/\\D/g,'')">
              </div>
              <div class="pc-field">
                <label>Chassi</label>
                <input type="text" id="pcChassi" maxlength="17" placeholder="Opcional" autocomplete="off"
                  oninput="this.value=this.value.toUpperCase()">
              </div>
            </div>

            <div id="pcFormError" class="pc-form-error" style="display:none"></div>

            <button type="button" onclick="PlateCheck._submit()" class="pc-cta">
              <span>Consultar agora</span>
              <span class="pc-cta-price">R$ 19,90</span>
            </button>
            <div class="pc-cta-note">Pagamento único via PIX · sem assinatura · resultado direto no app</div>
          </form>
        </div>

        <div class="pc-trust">
          <div class="pc-trust-item"><span>🏛️</span>Consulta oficial via base pública de restrições</div>
          <div class="pc-trust-item"><span>⚡</span>Resultado processado automaticamente após pagamento</div>
          <div class="pc-trust-item"><span>🔒</span>Seus dados de consulta ficam só na sua conta MOBYA</div>
        </div>

        <div class="pc-diff">
          <div class="pc-diff-ttl">Isso é diferente da "Vistoria" do app?</div>
          <div class="pc-diff-body">Sim. A <strong>Vistoria</strong> (na Home) é uma análise de risco por IA a
            partir do que você digita — útil como triagem inicial, mas não consulta nenhuma base oficial. Esta
            página aqui faz a <strong>consulta real na fonte pública de restrições do veículo</strong>, o dado
            que de fato importa antes de fechar uma compra.</div>
        </div>

        <div id="pcHistorySection"></div>
      </div>
    `;

    _loadHistory();
  }

  function _toggleAdv() {
    const box = document.getElementById('pcAdvFields');
    const btn = document.getElementById('pcToggleAdv');
    if (!box) return;
    const show = box.style.display === 'none';
    box.style.display = show ? 'block' : 'none';
    btn.textContent = show ? '− Ocultar Renavam / Chassi' : '+ Renavam / Chassi (opcional, ajuda a precisão)';
  }

  function _formError(msg) {
    const el = document.getElementById('pcFormError');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; return; }
    el.textContent = msg;
    el.style.display = 'block';
  }

  // ── SUBMIT: cobra e mostra modal de PIX ─────────────────────
  async function _submit() {
    const placa = (document.getElementById('pcPlaca')?.value || '').trim();
    const uf = document.getElementById('pcUf')?.value || '';
    const renavam = document.getElementById('pcRenavam')?.value?.trim() || undefined;
    const chassi = document.getElementById('pcChassi')?.value?.trim() || undefined;

    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) return _formError('Placa inválida. Use o formato ABC1234 ou ABC1D23.');
    if (!uf) return _formError('Selecione o estado (UF).');
    _formError(null);

    if (!API.isAuth()) { App.toast('Faça login pra consultar a placa.', 'warn'); window.MobyaAuth?.showLogin(); return; }

    _placa = placa;
    _showModal({ loading: true });
    try {
      const r = await API.vehicleCheck.standaloneCharge({ placa, uf, renavam, chassi });
      const { pix, amount, vehicleCheckId } = r.data || r;
      _checkId = vehicleCheckId;
      _amount = amount;
      _showModal({ loading: false, amount, qrCode: pix?.qrCode || null, qrCodeBase64: pix?.qrCodeBase64 || null });
      window.Analytics?.track('begin_checkout', { item_id: vehicleCheckId, value: amount || 0, currency: 'BRL' });
      _startPolling();
    } catch (e) {
      _showModal({ loading: false, error: e.message || 'Erro ao gerar PIX da consulta.' });
    }
  }

  function _startPolling() {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(async () => {
      try {
        const r = await API.vehicleCheck.standaloneStatus(_checkId);
        const data = r.data || r;
        if (data.verified) {
          _stopPolling();
          _onVerified(data);
        } else if (data.status === 'FAILED') {
          _stopPolling();
          _updateModalStatus('⚠️ A consulta falhou. Tente novamente em alguns minutos ou fale com o suporte.', 'warn');
        }
      } catch { /* silencioso, tenta de novo no próximo ciclo */ }
    }, 4000);
  }

  function _stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  function _onVerified(data) {
    window.Analytics?.track('purchase', {
      transaction_id: _checkId, value: _amount, currency: 'BRL', item_name: 'consulta_placa_standalone',
    });
    _closeModal();
    _renderResult(data);
    _loadHistory();
  }

  // ── RESULTADO ────────────────────────────────────────────────
  function _renderResult(data) {
    const el = main();
    if (!el) return;
    const restricao = data.existeRestricao === true;
    const statusColor = restricao ? '#ef4444' : '#10b981';
    const statusIcon = restricao ? '⚠️' : '✅';
    const statusText = restricao ? 'Restrição encontrada' : 'Nenhuma restrição encontrada';

    el.innerHTML = `
      <div class="pc-wrap">
        <div class="pc-result-card" style="border-color:${statusColor}55">
          <div class="pc-result-ico" style="background:${statusColor}22;color:${statusColor}">${statusIcon}</div>
          <div class="pc-result-plate">${data.placa || _placa || ''}</div>
          <div class="pc-result-status" style="color:${statusColor}">${statusText}</div>
          <div class="pc-result-sub">Consulta oficial concluída · fonte pública de restrições veiculares</div>
          <button class="pc-cta" onclick="PlateCheck.render()" style="margin-top:20px">
            <span>Fazer nova consulta</span>
          </button>
          <button onclick="App.navigate('classificados')" class="pc-result-secondary">Ver anúncios de veículos →</button>
        </div>
        <div id="pcHistorySection"></div>
      </div>
    `;
    _loadHistory();
  }

  // ── HISTÓRICO ────────────────────────────────────────────────
  async function _loadHistory() {
    const box = document.getElementById('pcHistorySection');
    if (!box || !API.isAuth()) return;
    try {
      const r = await API.vehicleCheck.standaloneMine();
      const checks = (r.data || r).checks || [];
      if (!checks.length) return;
      box.innerHTML = `
        <div class="pc-hist">
          <div class="pc-hist-ttl">Suas últimas consultas</div>
          ${checks.slice(0, 6).map(_historyRow).join('')}
        </div>`;
    } catch { /* histórico é opcional, falha silenciosa */ }
  }

  function _historyRow(c) {
    const STATUS_MAP = {
      PENDING_PAYMENT: { label: 'Aguardando pagamento', color: '#f59e0b' },
      PROCESSING:      { label: 'Processando…',          color: '#3b82f6' },
      COMPLETED:       { label: c.existeRestricao ? 'Restrição encontrada' : 'Sem restrição', color: c.existeRestricao ? '#ef4444' : '#10b981' },
      FAILED:          { label: 'Falhou',                 color: '#ef4444' },
    };
    const s = STATUS_MAP[c.status] || { label: c.status, color: 'var(--muted)' };
    const date = new Date(c.createdAt).toLocaleDateString('pt-BR');
    return `
      <div class="pc-hist-row">
        <div class="pc-hist-plate">${c.placa}<span class="pc-hist-uf">${c.uf}</span></div>
        <div class="pc-hist-status" style="color:${s.color}">${s.label}</div>
        <div class="pc-hist-date">${date}</div>
      </div>`;
  }

  // ── MODAL DE PIX (mesmo padrão visual do VehicleVerify) ─────
  function _updateModalStatus(msg, type) {
    const el = document.querySelector('#pc-overlay #pc-status-msg');
    if (!el) return;
    const color = type === 'warn' ? '#f59e0b' : '#ef4444';
    el.innerHTML = `<div style="color:${color};font-size:.82rem;text-align:center;padding:6px 0">${msg}</div>`;
  }

  function _closeModal() {
    _stopPolling();
    document.getElementById('pc-overlay')?.remove();
  }

  function _showModal({ loading, amount, qrCode, qrCodeBase64, error }) {
    _closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'pc-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.82);
      display:flex;align-items:center;justify-content:center`;

    let inner;
    if (loading) {
      inner = `<div style="text-align:center;padding:24px 0">
        <div style="font-size:2rem;margin-bottom:12px">🛡️</div>
        <div style="color:var(--muted);font-size:.9rem">Gerando PIX da consulta...</div>
        <div style="margin-top:16px;width:40px;height:40px;border:3px solid rgba(0,245,255,.2);
          border-top-color:#00f5ff;border-radius:50%;animation:pc-spin 1s linear infinite;margin:16px auto"></div>
        <style>@keyframes pc-spin{to{transform:rotate(360deg)}}</style>
      </div>`;
    } else if (error) {
      inner = `<div style="text-align:center;padding:20px 0">
        <div style="font-size:2rem;margin-bottom:10px">❌</div>
        <div style="color:#ef4444;font-size:.9rem;margin-bottom:16px">${error}</div>
        <button onclick="PlateCheck._closeModalPublic()" style="padding:10px 24px;border-radius:8px;
          background:var(--s2);border:1px solid var(--border);color:var(--text);cursor:pointer">Fechar</button>
      </div>`;
    } else {
      const priceFormatted = (amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const qrSection = qrCodeBase64
        ? `<div style="text-align:center;margin:14px 0">
            <img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code PIX"
              style="width:180px;height:180px;border-radius:10px;border:2px solid rgba(0,245,255,.3)"></div>`
        : `<div style="text-align:center;padding:20px;background:rgba(255,255,255,.04);border-radius:10px;
            margin:14px 0;color:var(--muted);font-size:.82rem">QR code não disponível — use o código abaixo</div>`;
      const copySection = qrCode
        ? `<button onclick="navigator.clipboard.writeText('${qrCode}').then(()=>{this.textContent='✅ Copiado!';
            setTimeout(()=>{this.textContent='📋 Copiar código PIX';},2000);})" style="width:100%;padding:12px;
            border-radius:10px;background:linear-gradient(135deg,rgba(0,245,255,.15),rgba(16,185,129,.15));
            border:1px solid rgba(0,245,255,.3);color:#00f5ff;font-weight:700;font-size:.9rem;cursor:pointer;
            font-family:'Space Grotesk',sans-serif">📋 Copiar código PIX</button>`
        : '';

      inner = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div style="font-size:1.6rem">🛡️</div>
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;color:var(--gold)">CONSULTA DE PLACA</div>
            <div style="font-size:.75rem;color:var(--muted)">${_placa || ''} · consulta oficial DETRAN</div>
          </div>
        </div>
        <div style="background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:12px;
          padding:14px 16px;margin-bottom:14px;text-align:center">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;color:var(--muted)">VALOR</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#10b981">${priceFormatted}</div>
        </div>
        ${qrSection}
        ${copySection}
        <div id="pc-status-msg" style="margin-top:14px"></div>
        <button onclick="PlateCheck._closeModalPublic()" style="width:100%;margin-top:10px;padding:10px;border-radius:8px;
          background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:.8rem">
          Fechar (a consulta continua sendo processada após o pagamento)
        </button>`;
    }

    overlay.innerHTML = `<div style="background:var(--s1,#0a0a12);border:1px solid var(--border2);
      border-radius:16px;padding:24px;max-width:360px;width:92%;max-height:88vh;overflow-y:auto">${inner}</div>`;
    document.body.appendChild(overlay);
  }

  return { render, _submit, _toggleAdv, _closeModalPublic: _closeModal };
})();
