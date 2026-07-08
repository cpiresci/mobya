// js/listing-boost.js
// ============================================================
// Frente G do master prompt — destaque pago de anúncio ("furar a fila" na
// busca por N dias). Mesmo padrão visual/fluxo do vehicle-verify.js (modal
// PIX + polling), mas próprio pra não criar acoplamento entre os dois
// módulos. Backend: POST /listings/:id/boost, GET /listings/:id/boost/status
// (listing-boost.routes.js).
// ============================================================
window.ListingBoost = (() => {
  let _pollTimer  = null;
  let _listingId  = null;
  let _amount     = null;
  let _overlay    = null;

  async function start(listingId) {
    _listingId = listingId;
    _showModal({ loading: true });
    try {
      const r = await API.listings.boost(listingId);
      const { amount, durationDays, pix } = r.data || r;
      _amount = amount;
      _showModal({ loading: false, amount, durationDays, qrCode: pix?.qrCode || null, qrCodeBase64: pix?.qrCodeBase64 || null });
      window.Analytics?.track('begin_checkout', { item_id: listingId, value: amount || 0, currency: 'BRL' });
      _startPolling(listingId);
    } catch (e) {
      _showModal({ loading: false, error: e.message || 'Erro ao gerar PIX de destaque.' });
    }
  }

  function _startPolling(listingId) {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(async () => {
      try {
        const r = await API.listings.boostStatus(listingId);
        const { boosted } = r.data || r;
        if (boosted) {
          clearInterval(_pollTimer); _pollTimer = null;
          _onBoosted();
        }
      } catch { /* silencioso, tenta de novo no próximo ciclo */ }
    }, 4000);
  }

  function _onBoosted() {
    window.Analytics?.track('purchase', {
      transaction_id: _listingId, value: _amount, currency: 'BRL', item_name: 'destaque_anuncio',
    });
    const msgEl = _overlay?.querySelector('#lb-status-msg');
    if (msgEl) {
      msgEl.innerHTML = `<div style="color:#10b981;font-size:1rem;font-weight:700;text-align:center;padding:8px 0">
        🚀 Anúncio destacado com sucesso!</div>`;
    }
    setTimeout(() => {
      _closeModal();
      if (typeof App !== 'undefined') App.navigate('listing', _listingId);
    }, 1800);
  }

  function _closeModal() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    document.getElementById('lb-overlay')?.remove();
    _overlay = null;
  }

  function _showModal({ loading, amount, durationDays, qrCode, qrCodeBase64, error }) {
    _closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'lb-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.82);
      display:flex;align-items:center;justify-content:center`;

    let inner;
    if (loading) {
      inner = `<div style="text-align:center;padding:24px 0">
        <div style="font-size:2rem;margin-bottom:12px">🚀</div>
        <div style="color:var(--muted);font-size:.9rem">Gerando PIX do destaque...</div>
        <div style="margin-top:16px;width:40px;height:40px;border:3px solid rgba(0,245,255,.2);
          border-top-color:#00f5ff;border-radius:50%;animation:lb-spin 1s linear infinite;margin:16px auto"></div>
        <style>@keyframes lb-spin{to{transform:rotate(360deg)}}</style>
      </div>`;
    } else if (error) {
      inner = `<div style="text-align:center;padding:20px 0">
        <div style="font-size:2rem;margin-bottom:10px">❌</div>
        <div style="color:#ef4444;font-size:.9rem;margin-bottom:16px">${error}</div>
        <button onclick="ListingBoost.close()" style="padding:10px 24px;border-radius:8px;
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
          <div style="font-size:1.6rem">🚀</div>
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:2px;color:var(--gold)">DESTACAR ANÚNCIO</div>
            <div style="font-size:.75rem;color:var(--muted)">Fura a fila da busca por ${durationDays || 7} dias</div>
          </div>
        </div>
        <div style="background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:12px;
          padding:14px 16px;margin-bottom:14px;text-align:center">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;color:var(--muted)">VALOR</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#10b981">${priceFormatted}</div>
        </div>
        ${qrSection}
        ${copySection}
        <div id="lb-status-msg" style="margin-top:14px"></div>
        <button onclick="ListingBoost.close()" style="width:100%;margin-top:10px;padding:10px;border-radius:8px;
          background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:.8rem">
          Fechar (o destaque ativa assim que o pagamento é confirmado)
        </button>`;
    }

    overlay.innerHTML = `<div style="background:var(--s1,#0a0a12);border:1px solid var(--border2);
      border-radius:16px;padding:24px;max-width:360px;width:92%;max-height:88vh;overflow-y:auto">${inner}</div>`;
    document.body.appendChild(overlay);
    _overlay = overlay;
  }

  return { start, close: _closeModal };
})();
