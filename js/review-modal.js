// ============================================================================
// MOBYA · REVIEW MODAL — avaliação genérica (1 a 5 estrelas + comentário)
// ----------------------------------------------------------------------------
// Sistema de reputação (master prompt v13). Cobre os 4 tipos que o
// RatingModal antigo (js/rating-modal.js) não cobria: vendedor/comprador de
// anúncio e anfitrião/locatário de aluguel. RatingModal continua existindo
// intacto pro fluxo de provider (GPS Tracking) -- não substituído aqui.
//
// Uso:
//   ReviewModal.prompt({
//     targetType: 'LISTING_BUYER',      // PROVIDER | LISTING_SELLER | LISTING_BUYER | RENTAL_HOST | RENTAL_GUEST
//     targetName: 'João Silva',         // nome exibido no modal
//     proof: { listingId: '...' },      // ou { bookingId }, ou { providerId, quoteId/sessionId }
//     onDone: () => {...}               // opcional, chamado após enviar ou pular
//   });
//
// Limitação conhecida: não verifica antes se já existe review pra essa
// transação (o backend tem unique constraint e retorna 409 nesse caso) --
// o modal só mostra o erro do 409 como toast em vez de esconder o botão de
// antemão. Simplificação aceitável pro MVP; dá pra refinar depois expondo
// um campo tipo `alreadyReviewed` na resposta do booking/listing.
// ============================================================================
window.ReviewModal = (() => {
  let _open = false;

  const LABELS = {
    PROVIDER:       'Como foi o atendimento?',
    LISTING_SELLER: 'Como foi negociar com o vendedor?',
    LISTING_BUYER:  'Como foi negociar com o comprador?',
    RENTAL_HOST:    'Como foi sua experiência com o anfitrião?',
    RENTAL_GUEST:   'Como foi sua experiência com o locatário?',
  };

  function prompt({ targetType, targetName, proof = {}, onDone } = {}) {
    if (_open || !targetType) return;
    _open = true;

    let selected = 0;

    const overlay = document.createElement('div');
    overlay.id = 'reviewModalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(5,5,12,.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

    const starsHtml = () => [1,2,3,4,5].map(n =>
      `<span class="rv-star" data-n="${n}" style="font-size:2rem;line-height:1;cursor:pointer;color:${n<=selected?'#f59e0b':'#444'};transition:color .15s">★</span>`
    ).join('');

    const question = LABELS[targetType] || 'Como foi sua experiência?';

    overlay.innerHTML = `
      <div style="background:var(--card-bg,#12121e);border:1px solid var(--border,#2a2a3d);border-radius:16px;padding:24px;max-width:360px;width:100%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.5)">
        <div style="font-size:1.5rem;margin-bottom:6px">⭐</div>
        <div style="font-size:1rem;font-weight:700;color:var(--text,#fff);margin-bottom:4px">${targetName ? `Avaliar ${escHtml(targetName)}` : 'Deixe sua avaliação'}</div>
        <div style="font-size:.82rem;color:var(--muted,#999);margin-bottom:16px">${question}</div>
        <div id="rvStars" style="display:flex;justify-content:center;gap:6px;margin-bottom:14px">${starsHtml()}</div>
        <textarea id="rvComment" maxlength="1000" placeholder="Comentário (opcional)" style="width:100%;min-height:64px;resize:vertical;background:var(--s3,#1a1a28);border:1px solid var(--border,#2a2a3d);border-radius:9px;padding:10px 12px;color:var(--text,#fff);font-family:inherit;font-size:.82rem;margin-bottom:14px;box-sizing:border-box"></textarea>
        <div style="display:flex;gap:8px">
          <button id="rvSkip" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--border,#2a2a3d);background:none;color:var(--muted,#999);font-size:.84rem;cursor:pointer">Agora não</button>
          <button id="rvSend" disabled style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--gold,#f59e0b);color:#1a1a1a;font-weight:700;font-size:.84rem;cursor:pointer;opacity:.5">Enviar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const starsEl = overlay.querySelector('#rvStars');
    const sendBtn = overlay.querySelector('#rvSend');
    const commentEl = overlay.querySelector('#rvComment');

    function repaint() {
      starsEl.querySelectorAll('.rv-star').forEach(el => {
        el.style.color = parseInt(el.dataset.n, 10) <= selected ? '#f59e0b' : '#444';
      });
      sendBtn.disabled = selected === 0;
      sendBtn.style.opacity = selected === 0 ? '.5' : '1';
    }

    starsEl.querySelectorAll('.rv-star').forEach(el => {
      el.addEventListener('click', () => { selected = parseInt(el.dataset.n, 10); repaint(); });
    });

    function close() {
      overlay.remove();
      _open = false;
      if (typeof onDone === 'function') onDone();
    }

    overlay.querySelector('#rvSkip').addEventListener('click', close);

    sendBtn.addEventListener('click', async () => {
      if (!selected) return;
      sendBtn.disabled = true;
      sendBtn.textContent = 'Enviando...';
      try {
        await API.reviews.create({
          targetType,
          score: selected,
          comment: commentEl.value.trim() || undefined,
          ...proof,
        });
        if (typeof App !== 'undefined' && App.toast) App.toast('⭐ Avaliação enviada, obrigado!', 'ok');
        else if (typeof Toast !== 'undefined') Toast.show('⭐ Avaliação enviada, obrigado!', 'ok');
      } catch (e) {
        const msg = e?.message || 'Não foi possível enviar a avaliação.';
        if (typeof App !== 'undefined' && App.toast) App.toast(msg, 'err');
        else if (typeof Toast !== 'undefined') Toast.show(msg, 'error');
      }
      close();
    });
  }

  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  return { prompt };
})();
