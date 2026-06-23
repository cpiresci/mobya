// js/emergency-payment.js
// Módulo responsável pelo fluxo de pagamento PIX do cliente.
//
// Fluxo:
//   1. SOS confirmado → API cria a Emergency (sem dispatch)
//   2. showPixPayment() exibe modal com QR code + valor estimado
//   3. Polling de /emergency/:id/payment-status até customerPaymentStatus === 'PAID'
//   4. Pago → fecha modal → navega para ultra-gps (que fica esperando o aceite)
//   5. Se o usuário fechar → pode reabrir via botão no painel

window.EmergencyPayment = (() => {
  let _pollTimer   = null;
  let _emergencyId = null;
  let _overlay     = null;

  // ── Inicia o fluxo completo: chama API, exibe modal ──────────────────────
  async function showPixPayment(emergencyId) {
    _emergencyId = emergencyId;

    // Exibe modal de carregamento imediatamente
    _showModal({ loading: true });

    try {
      const r = await API.emergency.initiatePayment(emergencyId);
      const { estimatedPrice, breakdown, pix, customerPaymentStatus, idempotent } = r.data || r;

      if (customerPaymentStatus === 'PAID') {
        // Já foi pago (idempotência) — vai direto pro GPS
        _onPaymentConfirmed();
        return;
      }

      _showModal({
        loading:        false,
        estimatedPrice,
        breakdown,
        qrCode:         pix?.qrCode || null,
        qrCodeBase64:   pix?.qrCodeBase64 || null,
        emergencyId,
        idempotent,
      });

      _startPolling(emergencyId);
    } catch (e) {
      _showModal({ loading: false, error: e.message || 'Erro ao gerar PIX.' });
    }
  }

  // ── Polling de status ─────────────────────────────────────────────────────
  function _startPolling(emergencyId) {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(async () => {
      try {
        const r = await API.emergency.paymentStatus(emergencyId);
        const { customerPaymentStatus } = r.data || r;
        if (customerPaymentStatus === 'PAID') {
          clearInterval(_pollTimer);
          _pollTimer = null;
          _onPaymentConfirmed();
        } else if (customerPaymentStatus === 'REFUNDED' || customerPaymentStatus === 'UNPAID') {
          clearInterval(_pollTimer);
          _pollTimer = null;
          _updateModalStatus('⚠️ Pagamento não confirmado. Tente gerar um novo PIX.', 'warn');
        }
      } catch { /* silencioso — tenta de novo no próximo ciclo */ }
    }, 4000); // polling a cada 4s
  }

  // ── Pagamento confirmado ──────────────────────────────────────────────────
  function _onPaymentConfirmed() {
    if (_overlay) {
      _overlay.querySelector('#pix-status-msg').innerHTML =
        `<div style="color:#10b981;font-size:1.1rem;font-weight:700;text-align:center;padding:8px 0">
          ✅ Pagamento confirmado!<br>
          <span style="font-size:.82rem;color:var(--muted)">Buscando prestador próximo...</span>
        </div>`;
      setTimeout(() => {
        _closeModal();
        // Navega para GPS tracking (já tem o emergencyId armazenado)
        window.__mobyaPendingEmergencyId = _emergencyId;
        if (typeof App !== 'undefined') App.navigate('ultra-gps');
      }, 1800);
    } else {
      window.__mobyaPendingEmergencyId = _emergencyId;
      if (typeof App !== 'undefined') App.navigate('ultra-gps');
    }
  }

  function _updateModalStatus(msg, type) {
    const el = _overlay?.querySelector('#pix-status-msg');
    if (!el) return;
    const color = type === 'warn' ? '#f59e0b' : '#ef4444';
    el.innerHTML = `<div style="color:${color};font-size:.82rem;text-align:center;padding:6px 0">${msg}</div>`;
  }

  // ── Modal PIX ─────────────────────────────────────────────────────────────
  function _showModal({ loading, estimatedPrice, breakdown, qrCode, qrCodeBase64, emergencyId, idempotent, error }) {
    _closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'pix-payment-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:10000;
      background:rgba(0,0,0,.82);
      display:flex;align-items:center;justify-content:center;
      animation:pix-fadein .2s ease;
    `;

    if (!document.getElementById('pix-styles')) {
      const s = document.createElement('style');
      s.id = 'pix-styles';
      s.textContent = `
        @keyframes pix-fadein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        #pix-modal { font-family:'Space Grotesk',sans-serif; }
        #pix-modal .pix-label {
          font-family:'JetBrains Mono',monospace;font-size:.6rem;
          letter-spacing:2px;color:var(--muted,#888);margin-bottom:4px;
        }
        #pix-modal .pix-value {
          font-family:'Bebas Neue',sans-serif;font-size:2rem;
          background:linear-gradient(135deg,#10b981,#00f5ff);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
        }
        #pix-modal .pix-breakdown {
          display:grid;grid-template-columns:1fr 1fr 1fr;
          gap:6px;margin:12px 0;
        }
        #pix-modal .pix-breakdown > div {
          background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
          border-radius:8px;padding:8px 10px;text-align:center;
        }
        #pix-modal .bd-label { font-size:.58rem;color:var(--muted,#888);margin-bottom:2px; }
        #pix-modal .bd-val   { font-size:.84rem;font-weight:700; }
        #pix-qr-img { image-rendering:pixelated; }
        .pix-copy-btn {
          width:100%;padding:12px;border-radius:10px;
          background:linear-gradient(135deg,rgba(0,245,255,.15),rgba(16,185,129,.15));
          border:1px solid rgba(0,245,255,.3);color:#00f5ff;
          font-weight:700;font-size:.9rem;cursor:pointer;
          font-family:'Space Grotesk',sans-serif;
          transition:all .2s;
        }
        .pix-copy-btn:hover { background:rgba(0,245,255,.25); }
        .pix-copy-btn.copied { color:#10b981;border-color:#10b981; }
      `;
      document.head.appendChild(s);
    }

    let inner = '';

    if (loading) {
      inner = `
        <div style="text-align:center;padding:24px 0">
          <div style="font-size:2rem;margin-bottom:12px">⚡</div>
          <div style="color:var(--muted,#888);font-size:.9rem">Calculando preço e gerando PIX...</div>
          <div style="margin-top:16px;width:40px;height:40px;border:3px solid rgba(0,245,255,.2);
            border-top-color:#00f5ff;border-radius:50%;animation:spin 1s linear infinite;margin:16px auto"></div>
          <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        </div>`;
    } else if (error) {
      inner = `
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:2rem;margin-bottom:10px">❌</div>
          <div style="color:#ef4444;font-size:.9rem;margin-bottom:16px">${error}</div>
          <button onclick="document.getElementById('pix-payment-overlay').remove()"
            style="padding:10px 24px;border-radius:8px;background:var(--s2,#1e293b);
            border:1px solid var(--border);color:var(--text);cursor:pointer">
            Fechar
          </button>
        </div>`;
    } else {
      const priceFormatted = (estimatedPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const providerReceives = (breakdown?.providerReceives || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const commission = ((breakdown?.commissionRate || 0.1) * 100).toFixed(0);

      const qrSection = qrCodeBase64
        ? `<div style="text-align:center;margin:14px 0">
            <img id="pix-qr-img" src="data:image/png;base64,${qrCodeBase64}"
              alt="QR Code PIX" style="width:180px;height:180px;border-radius:10px;
              border:2px solid rgba(0,245,255,.3)">
           </div>`
        : `<div style="text-align:center;padding:20px;background:rgba(255,255,255,.04);
            border-radius:10px;margin:14px 0;color:var(--muted);font-size:.82rem">
            QR code não disponível — use o código abaixo
           </div>`;

      const copySection = qrCode
        ? `<button class="pix-copy-btn" onclick="
            navigator.clipboard.writeText('${qrCode}').then(()=>{
              this.textContent='✅ Copiado!';this.classList.add('copied');
              setTimeout(()=>{this.textContent='📋 Copiar código PIX (Copia e Cola)';this.classList.remove('copied');},2000);
            }).catch(()=>App.toast('Copie o código manualmente','warn'));
          ">📋 Copiar código PIX (Copia e Cola)</button>`
        : '';

      inner = `
        <!-- Título -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div style="font-size:1.6rem">🔐</div>
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;
              letter-spacing:2px;color:var(--q4,#f59e0b)">PAGAMENTO SEGURO</div>
            <div style="font-size:.75rem;color:var(--muted)">O prestador só é acionado após a confirmação</div>
          </div>
        </div>

        <!-- Valor estimado -->
        <div style="background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);
          border-radius:12px;padding:14px 16px;margin-bottom:14px">
          <div class="pix-label">VALOR ESTIMADO DO SERVIÇO</div>
          <div class="pix-value">${priceFormatted}</div>
          <div class="pix-breakdown">
            <div>
              <div class="bd-label">DISTÂNCIA</div>
              <div class="bd-val" style="color:var(--muted)">${(breakdown?.distanceKm || 0).toFixed(1)} km</div>
            </div>
            <div>
              <div class="bd-label">PRESTADOR RECEBE</div>
              <div class="bd-val" style="color:#10b981">${providerReceives}</div>
            </div>
            <div>
              <div class="bd-label">TAXA MOBYA</div>
              <div class="bd-val" style="color:var(--muted)">${commission}%</div>
            </div>
          </div>
          <div style="font-size:.7rem;color:var(--muted);margin-top:4px">
            ⚡ Valor travado agora — reembolso automático se nenhum prestador aceitar
          </div>
        </div>

        <!-- QR Code PIX -->
        ${qrSection}

        <!-- Copiar -->
        <div style="margin-bottom:12px">${copySection}</div>

        <!-- Status / polling indicator -->
        <div id="pix-status-msg" style="min-height:28px">
          <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:.78rem">
            <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;
              animation:pix-pulse 1.5s ease-in-out infinite"></div>
            Aguardando confirmação do pagamento...
            <style>@keyframes pix-pulse{0%,100%{opacity:1}50%{opacity:.3}}</style>
          </div>
        </div>

        <!-- Aviso de segurança -->
        <div style="margin-top:14px;font-size:.68rem;color:var(--muted);
          border-top:1px solid rgba(255,255,255,.06);padding-top:10px;line-height:1.6">
          🔒 Pagamento processado pelo MercadoPago. A MOBYA retém o valor e repassa ao
          prestador somente após a conclusão do serviço.
        </div>
      `;
    }

    overlay.innerHTML = `
      <div id="pix-modal" style="
        background:var(--card-bg,#0f172a);
        border:1px solid rgba(0,245,255,.15);
        border-radius:18px;
        width:calc(100% - 24px);max-width:400px;
        padding:20px 20px 18px;
        box-shadow:0 8px 40px rgba(0,0,0,.7),0 0 0 1px rgba(0,245,255,.05) inset;
      ">
        ${inner}
      </div>`;

    document.body.appendChild(overlay);
    _overlay = overlay;
  }

  function _closeModal() {
    if (_overlay) { _overlay.remove(); _overlay = null; }
  }

  // API pública
  return { showPixPayment };
})();
