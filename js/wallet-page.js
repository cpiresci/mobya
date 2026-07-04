// js/wallet-page.js
// Painel de carteira para prestadores — saldo, extrato e saques.
// Acessado via App.navigate('carteira-prestador')

window.WalletPage = (() => {
  function _fmt(v) {
    return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function render() {
    const main = document.getElementById('main');
    if (!main) return;

    const centralBar = (typeof Central !== 'undefined') ? Central.tabBar('carteira') : '';
    main.innerHTML = `
      ${centralBar}
      <div style="padding:18px 16px;max-width:540px;margin:0 auto">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;
          letter-spacing:2px;background:linear-gradient(135deg,#10b981,#00f5ff);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px">
          ⚡ MINHA CARTEIRA
        </div>
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:20px">
          Saldo dos seus serviços MOBYA
        </div>
        <div id="wallet-content">
          <div style="color:var(--muted);font-size:.85rem">Carregando...</div>
        </div>
      </div>`;

    try {
      const [balanceRes, txRes, withdrawRes] = await Promise.all([
        API.wallet.balance(),
        API.wallet.transactions({ limit: 20 }),
        API.wallet.withdrawals(),
      ]);

      const b  = balanceRes.data || balanceRes;
      const txs = txRes.data || txRes || [];
      const withdrawals = withdrawRes.data || withdrawRes || [];

      document.getElementById('wallet-content').innerHTML = `
        <!-- Saldos -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
          <div style="background:linear-gradient(135deg,rgba(16,185,129,.1),rgba(0,245,255,.05));
            border:1px solid rgba(16,185,129,.25);border-radius:14px;padding:16px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;
              letter-spacing:2px;color:#10b981;margin-bottom:6px">DISPONÍVEL</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:#10b981">
              ${_fmt(b.walletBalance)}
            </div>
            <div style="font-size:.7rem;color:var(--muted);margin-top:4px">Pronto para sacar</div>
          </div>
          <div style="background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);
            border-radius:14px;padding:16px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;
              letter-spacing:2px;color:#f59e0b;margin-bottom:6px">RETIDO</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:#f59e0b">
              ${_fmt(b.walletPending)}
            </div>
            <div style="font-size:.7rem;color:var(--muted);margin-top:4px">Libera em até 3 dias</div>
          </div>
        </div>

        <!-- Botão sacar -->
        <button onclick="WalletPage.showWithdrawModal(${b.walletBalance})"
          ${b.walletBalance < 10 ? 'disabled' : ''}
          style="width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;
            background:${b.walletBalance >= 10
              ? 'linear-gradient(135deg,#10b981,#059669)'
              : 'rgba(255,255,255,.05)'};
            color:${b.walletBalance >= 10 ? '#fff' : 'var(--muted)'};
            font-weight:700;font-size:.95rem;font-family:'Space Grotesk',sans-serif;
            margin-bottom:20px;transition:opacity .2s"
          ${b.walletBalance >= 10 ? '' : 'title="Saldo mínimo R$ 10,00"'}>
          💸 Solicitar Saque
          ${b.walletBalance < 10 ? ' (mín. R$ 10,00)' : ' — ' + _fmt(b.walletBalance)}
        </button>

        <!-- Saques recentes -->
        ${withdrawals.length > 0 ? `
        <div style="margin-bottom:20px">
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;
            letter-spacing:2px;color:var(--muted);margin-bottom:10px">SAQUES RECENTES</div>
          ${withdrawals.slice(0,5).map(w => {
            const statusColor = { PENDING:'#f59e0b', APPROVED:'#00f5ff', PAID:'#10b981', REJECTED:'#ef4444' }[w.status] || '#888';
            const statusLabel = { PENDING:'⏳ Pendente', APPROVED:'✅ Aprovado', PAID:'💰 Pago', REJECTED:'❌ Rejeitado' }[w.status] || w.status;
            return `<div style="display:flex;justify-content:space-between;align-items:center;
              padding:10px 14px;background:var(--s2);border:1px solid var(--border);
              border-radius:10px;margin-bottom:6px">
              <div>
                <div style="font-size:.85rem;font-weight:600">${_fmt(w.amount)}</div>
                <div style="font-size:.7rem;color:var(--muted)">${w.pixKeyType}: ${w.pixKey.slice(0,20)}...</div>
              </div>
              <div style="font-size:.75rem;color:${statusColor};font-weight:600">${statusLabel}</div>
            </div>`;
          }).join('')}
        </div>` : ''}

        <!-- Extrato -->
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:.63rem;
            letter-spacing:2px;color:var(--muted);margin-bottom:10px">EXTRATO</div>
          ${txs.length === 0
            ? '<div style="color:var(--muted);font-size:.82rem;text-align:center;padding:20px">Nenhuma movimentação ainda</div>'
            : txs.map(t => {
                const isCredit   = t.type === 'CREDIT_JOB' || t.type === 'RELEASE_PENDING';
                const isDebit    = t.type === 'DEBIT_WITHDRAWAL';
                const typeLabel  = { CREDIT_JOB:'Job concluído', DEBIT_WITHDRAWAL:'Saque', RELEASE_PENDING:'Liberação' }[t.type] || t.type;
                const icon       = isDebit ? '💸' : t.type === 'RELEASE_PENDING' ? '🔓' : '💰';
                const color      = isDebit ? '#ef4444' : '#10b981';
                const signal     = isDebit ? '-' : '+';
                const dt = new Date(t.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
                return `<div style="display:flex;justify-content:space-between;align-items:center;
                  padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)">
                  <div style="display:flex;gap:10px;align-items:center">
                    <div style="font-size:1.1rem">${icon}</div>
                    <div>
                      <div style="font-size:.83rem;color:var(--text)">${typeLabel}</div>
                      <div style="font-size:.7rem;color:var(--muted)">${dt}${t.description ? ' · ' + t.description.slice(0,30) : ''}</div>
                    </div>
                  </div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:.88rem;
                    font-weight:700;color:${color}">${signal}${_fmt(t.amount)}</div>
                </div>`;
              }).join('')
          }
        </div>
      `;
    } catch(e) {
      document.getElementById('wallet-content').innerHTML =
        `<div style="color:#ef4444;font-size:.85rem">${e.message || 'Erro ao carregar carteira'}</div>`;
    }
  }

  function showWithdrawModal(balance) {
    const existing = document.getElementById('withdraw-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'withdraw-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:10001;
      background:rgba(0,0,0,.8);
      display:flex;align-items:center;justify-content:center;
    `;
    overlay.innerHTML = `
      <div style="background:var(--card-bg,#0f172a);border:1px solid rgba(255,255,255,.1);
        border-radius:16px;padding:22px;width:calc(100% - 32px);max-width:380px">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;
          color:var(--q4,#f59e0b);margin-bottom:16px">💸 SOLICITAR SAQUE</div>

        <div style="margin-bottom:12px">
          <div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;margin-bottom:4px">VALOR (máx. ${(balance||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})})</div>
          <input id="wd-amount" type="number" min="10" max="${balance||0}" step="0.01"
            placeholder="Ex: 150.00"
            style="width:100%;background:rgba(255,255,255,.06);border:1px solid var(--border);
            color:var(--text);padding:10px 12px;border-radius:8px;font-size:.9rem;outline:none;box-sizing:border-box">
        </div>

        <div style="margin-bottom:12px">
          <div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;margin-bottom:4px">TIPO DE CHAVE PIX</div>
          <select id="wd-key-type"
            style="width:100%;background:rgba(255,255,255,.06);border:1px solid var(--border);
            color:var(--text);padding:10px 12px;border-radius:8px;font-size:.85rem;outline:none">
            <option value="CPF">CPF</option>
            <option value="CNPJ">CNPJ</option>
            <option value="EMAIL">E-mail</option>
            <option value="PHONE">Telefone</option>
            <option value="RANDOM">Chave aleatória</option>
          </select>
        </div>

        <div style="margin-bottom:18px">
          <div style="font-size:.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;
            letter-spacing:1px;margin-bottom:4px">CHAVE PIX</div>
          <input id="wd-key" type="text" placeholder="Sua chave PIX"
            style="width:100%;background:rgba(255,255,255,.06);border:1px solid var(--border);
            color:var(--text);padding:10px 12px;border-radius:8px;font-size:.85rem;outline:none;box-sizing:border-box">
        </div>

        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('withdraw-overlay').remove()"
            style="flex:1;padding:12px;border-radius:8px;background:transparent;
            border:1px solid var(--border);color:var(--muted);cursor:pointer">
            Cancelar
          </button>
          <button id="wd-submit-btn" onclick="WalletPage.submitWithdraw()"
            style="flex:2;padding:12px;border-radius:8px;border:none;
            background:linear-gradient(135deg,#10b981,#059669);
            color:#fff;font-weight:700;cursor:pointer;font-size:.9rem">
            Solicitar Saque
          </button>
        </div>

        <div id="wd-msg" style="margin-top:10px;min-height:20px;font-size:.78rem;text-align:center"></div>
      </div>`;

    document.body.appendChild(overlay);
  }

  async function submitWithdraw() {
    const amount  = parseFloat(document.getElementById('wd-amount')?.value);
    const pixKey  = document.getElementById('wd-key')?.value.trim();
    const pixKeyType = document.getElementById('wd-key-type')?.value;
    const msgEl   = document.getElementById('wd-msg');
    const btn     = document.getElementById('wd-submit-btn');

    if (!amount || amount < 10) {
      if (msgEl) msgEl.innerHTML = '<span style="color:#ef4444">Valor mínimo: R$ 10,00</span>';
      return;
    }
    if (!pixKey) {
      if (msgEl) msgEl.innerHTML = '<span style="color:#ef4444">Informe a chave PIX</span>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';
    try {
      await API.wallet.withdraw({ amount, pixKey, pixKeyType });
      if (msgEl) msgEl.innerHTML = '<span style="color:#10b981">✅ Pedido enviado! Processamos em até 1 dia útil.</span>';
      setTimeout(() => {
        document.getElementById('withdraw-overlay')?.remove();
        render(); // recarrega a tela com o saldo atualizado
      }, 2000);
    } catch(e) {
      btn.disabled = false;
      btn.textContent = 'Solicitar Saque';
      if (msgEl) msgEl.innerHTML = `<span style="color:#ef4444">${e.message || 'Erro ao solicitar saque'}</span>`;
    }
  }

  return { render, showWithdrawModal, submitWithdraw };
})();
