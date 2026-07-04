// js/vehicle-verify.js
// ============================================================
// Frente A do master prompt — selo de "veículo verificado" pago via PIX.
// Mesmo padrão visual/fluxo do emergency-payment.js (modal PIX + polling),
// mas próprio pra não criar acoplamento entre os dois módulos.
// ============================================================
window.VehicleVerify = (() => {
  let _pollTimer  = null;
  let _listingId  = null;
  let _overlay    = null;

  async function start(listingId) {
    _listingId = listingId;
    _showModal({ loading: true });
    try {
      const r = await API.listings.verifyCharge(listingId);
      const { pix, amount } = r.data || r;
      _showModal({ loading: false, amount, qrCode: pix?.qrCode || null, qrCodeBase64: pix?.qrCodeBase64 || null });
      _startPolling(listingId);
    } catch (e) {
      _showModal({ loading: false, error: e.message || 'Erro ao gerar PIX de verificação.' });
    }
  }

  function _startPolling(listingId) {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(async () => {
      try {
        const r = await API.listings.verifyStatus(listingId);
        const { verified, status } = r.data || r;
        if (verified) {
          clearInterval(_pollTimer); _pollTimer = null;
          _onVerified();
        } else if (status === 'FAILED') {
          clearInterval(_pollTimer); _pollTimer = null;
          _updateStatus('⚠️ A consulta falhou. Tente novamente em alguns minutos ou fale com o suporte.', 'warn');
        }
      } catch { /* silencioso, tenta de novo no próximo ciclo */ }
    }, 4000);
  }

  function _onVerified() {
    const msgEl = _overlay?.querySelector('#vv-status-msg');
    if (msgEl) {
      msgEl.innerHTML = `<div style="color:#10b981;font-size:1rem;font-weight:700;text-align:center;padding:8px 0">
        ✅ Veículo verificado com sucesso!</div>`;
    }
    setTimeout(() => {
      _closeModal();
      if (typeof Pages !== 'undefined' && typeof App !== 'undefined') App.navigate('dashboard');
    }, 1800);
  }

  function _updateStatus(msg, type) {
    const el = _overlay?.querySelector('#vv-status-msg');
    if (!el) return;
    const color = type === 'warn' ? '#f59e0b' : '#ef4444';
    el.innerHTML = `<div style="color:${color};font-size:.82rem;text-align:center;padding:6px 0">${msg}</div>`;
  }

  function _closeModal() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    document.getElementById('vv-overlay')?.remove();
    _overlay = null;
  }

  function _showModal({ loading, amount, qrCode, qrCodeBase64, error }) {
    _closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'vv-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.82);
      display:flex;align-items:center;justify-content:center`;

    let inner;
    if (loading) {
      inner = `<div style="text-align:center;padding:24px 0">
        <div style="font-size:2rem;margin-bottom:12px">🛡️</div>
        <div style="color:var(--muted);font-size:.9rem">Gerando PIX da verificação...</div>
        <div style="margin-top:16px;width:40px;height:40px;border:3px solid rgba(0,245,255,.2);
          border-top-color:#00f5ff;border-radius:50%;animation:vv-spin 1s linear infinite;margin:16px auto"></div>
        <style>@keyframes vv-spin{to{transform:rotate(360deg)}}</style>
      </div>`;
    } else if (error) {
      inner = `<div style="text-align:center;padding:20px 0">
        <div style="font-size:2rem;margin-bottom:10px">❌</div>
        <div style="color:#ef4444;font-size:.9rem;margin-bottom:16px">${error}</div>
        <button onclick="VehicleVerify.close()" style="padding:10px 24px;border-radius:8px;
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
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;color:var(--gold)">VERIFICAR VEÍCULO</div>
            <div style="font-size:.75rem;color:var(--muted)">Consulta de restrições em fonte oficial</div>
          </div>
        </div>
        <div style="background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:12px;
          padding:14px 16px;margin-bottom:14px;text-align:center">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;color:var(--muted)">VALOR</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#10b981">${priceFormatted}</div>
        </div>
        ${qrSection}
        ${copySection}
        <div id="vv-status-msg" style="margin-top:14px"></div>
        <button onclick="VehicleVerify.close()" style="width:100%;margin-top:10px;padding:10px;border-radius:8px;
          background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:.8rem">
          Fechar (a verificação continua sendo processada após o pagamento)
        </button>`;
    }

    overlay.innerHTML = `<div style="background:var(--s1,#0a0a12);border:1px solid var(--border2);
      border-radius:16px;padding:24px;max-width:360px;width:92%;max-height:88vh;overflow-y:auto">${inner}</div>`;
    document.body.appendChild(overlay);
    _overlay = overlay;
  }

  return { start, close: _closeModal };
})();
