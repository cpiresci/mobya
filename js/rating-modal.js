// ============================================================================
// MOBYA · RATING MODAL — avaliação de prestador (1 a 5 estrelas)
// ----------------------------------------------------------------------------
// Disparado pelo GPS Tracking / Ultra GPS quando uma sessão chega ao status
// CONCLUIDO (apenas para quem está no papel USER). Chama
// API.rateProvider(providerId, { rating, sessionId, quoteId }).
// sessionId é o que a rota usa pra travar avaliação duplicada do mesmo
// atendimento — sempre disponível, ao contrário de quoteId (sessões de
// emergência/SOS não têm quote associado).
// ============================================================================
window.RatingModal = (() => {
  let _open = false;

  function prompt(providerId, sessionId, quoteId, opts = {}) {
    if (_open || !providerId) return;
    _open = true;

    let selected = 0;

    const overlay = document.createElement('div');
    overlay.id = 'ratingModalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,5,12,.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

    const starsHtml = () => [1,2,3,4,5].map(n =>
      `<span class="rm-star" data-n="${n}" style="font-size:2rem;line-height:1;cursor:pointer;color:${n<=selected?'#f59e0b':'#444'};transition:color .15s">★</span>`
    ).join('');

    overlay.innerHTML = `
      <div style="background:var(--card-bg,#12121e);border:1px solid var(--border,#2a2a3d);border-radius:16px;padding:24px;max-width:340px;width:100%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.5)">
        <div style="font-size:1.5rem;margin-bottom:6px">✅</div>
        <div style="font-size:1rem;font-weight:700;color:var(--text,#fff);margin-bottom:4px">Serviço concluído!</div>
        <div style="font-size:.82rem;color:var(--muted,#999);margin-bottom:16px">${opts.providerName ? `Como foi seu atendimento com ${opts.providerName}?` : 'Como foi seu atendimento?'}</div>
        <div id="rmStars" style="display:flex;justify-content:center;gap:6px;margin-bottom:18px">${starsHtml()}</div>
        <div style="display:flex;gap:8px">
          <button id="rmSkip" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--border,#2a2a3d);background:none;color:var(--muted,#999);font-size:.84rem;cursor:pointer">Agora não</button>
          <button id="rmSend" disabled style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--gold,#f59e0b);color:#1a1a1a;font-weight:700;font-size:.84rem;cursor:pointer;opacity:.5">Enviar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const starsEl = overlay.querySelector('#rmStars');
    const sendBtn = overlay.querySelector('#rmSend');

    function repaint() {
      starsEl.querySelectorAll('.rm-star').forEach(el => {
        el.style.color = parseInt(el.dataset.n, 10) <= selected ? '#f59e0b' : '#444';
      });
      sendBtn.disabled = selected === 0;
      sendBtn.style.opacity = selected === 0 ? '.5' : '1';
    }

    starsEl.querySelectorAll('.rm-star').forEach(el => {
      el.addEventListener('click', () => { selected = parseInt(el.dataset.n, 10); repaint(); });
    });

    function close() {
      overlay.remove();
      _open = false;
    }

    overlay.querySelector('#rmSkip').addEventListener('click', close);

    sendBtn.addEventListener('click', async () => {
      if (!selected) return;
      sendBtn.disabled = true;
      sendBtn.textContent = 'Enviando...';
      try {
        await API.rateProvider(providerId, { rating: selected, sessionId, quoteId });
        if (typeof Toast !== 'undefined') Toast.show('⭐ Avaliação enviada, obrigado!', 'ok');
      } catch (e) {
        if (typeof Toast !== 'undefined') Toast.show(e?.message || 'Não foi possível enviar a avaliação.', 'error');
      }
      close();
    });
  }

  return { prompt };
})();
