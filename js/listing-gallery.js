// ============================================================
// MOBYA — listing-gallery.js  Quantum Engine v1.0
// Galeria de fotos ultra premium (carrossel + lightbox) para anúncios.
// Sem dependências externas. Suporta swipe, teclado, zoom e thumbs.
// ============================================================

window.ListingGallery = (() => {

  const state = {};   // { [galId]: { imgs, idx } }
  let lb = null;       // { imgs, idx, id }

  // ── util ─────────────────────────────────────────────────────
  function esc(u){ return String(u).replace(/"/g,'&quot;'); }

  // ── CARROSSEL PRINCIPAL (usado na página de detalhe do anúncio) ──
  function render(images, listingId, opts={}) {
    const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
    const id = 'lg_' + String(listingId).replace(/[^a-zA-Z0-9_-]/g,'');
    state[id] = { imgs, idx: 0 };

    if (!imgs.length) {
      return `<div class="lg-empty"><span>🚗</span></div>`;
    }

    const tag = opts.tag !== false ? `<div class="lg-quantum-tag">⬡ GALERIA QUÂNTICA</div>` : '';

    return `
      <div class="lg-wrap" id="${id}">
        <div class="lg-main" id="${id}_main">
          <div class="lg-main-track" id="${id}_track">
            ${imgs.map((u,i) => `
              <div class="lg-slide">
                <img src="${esc(window.cldOptimize(u))}" loading="${i===0?'eager':'lazy'}"
                  onclick="ListingGallery.openLightbox('${id}')" alt="Foto ${i+1}">
              </div>`).join('')}
          </div>
          ${imgs.length>1?`
            <button class="lg-arrow lg-prev" onclick="ListingGallery.prev('${id}')" aria-label="Foto anterior">‹</button>
            <button class="lg-arrow lg-next" onclick="ListingGallery.next('${id}')" aria-label="Próxima foto">›</button>
            <div class="lg-counter" id="${id}_counter">1 / ${imgs.length}</div>
          `:''}
          ${tag}
          <button class="lg-expand" onclick="ListingGallery.openLightbox('${id}')" aria-label="Tela cheia">⛶</button>
        </div>
        ${imgs.length>1?`
          <div class="lg-dots" id="${id}_dots">
            ${imgs.map((_,i)=>`<span class="lg-dot ${i===0?'active':''}" onclick="ListingGallery.goTo('${id}',${i})"></span>`).join('')}
          </div>
          <div class="lg-thumbs" id="${id}_thumbs">
            ${imgs.map((u,i)=>`
              <div class="lg-thumb ${i===0?'active':''}" onclick="ListingGallery.goTo('${id}',${i})">
                <img src="${esc(window.cldOptimize(u))}" loading="lazy">
              </div>`).join('')}
          </div>
        `:''}
      </div>`;
  }

  // Deve ser chamado (setTimeout 0) após o innerHTML da galeria ser inserido no DOM.
  function init(listingId) {
    const id = 'lg_' + String(listingId).replace(/[^a-zA-Z0-9_-]/g,'');
    const main = document.getElementById(`${id}_main`);
    if (!main || main._lgBound) return;
    main._lgBound = true;
    attachSwipe(main, () => next(id), () => prev(id));
  }

  function _apply(id) {
    const st = state[id]; if (!st) return;
    const track = document.getElementById(`${id}_track`);
    if (track) track.style.transform = `translateX(-${st.idx*100}%)`;
    const counter = document.getElementById(`${id}_counter`);
    if (counter) counter.textContent = `${st.idx+1} / ${st.imgs.length}`;
    document.querySelectorAll(`#${id}_dots .lg-dot`).forEach((d,i)=>d.classList.toggle('active', i===st.idx));
    document.querySelectorAll(`#${id}_thumbs .lg-thumb`).forEach((t,i)=>{
      t.classList.toggle('active', i===st.idx);
      if (i===st.idx) t.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
    });
  }

  function goTo(id, i) { const st=state[id]; if(!st) return; st.idx=((i%st.imgs.length)+st.imgs.length)%st.imgs.length; _apply(id); }
  function next(id)    { const st=state[id]; if(!st) return; goTo(id, st.idx+1); }
  function prev(id)    { const st=state[id]; if(!st) return; goTo(id, st.idx-1); }

  // ── SWIPE (touch) genérico ──────────────────────────────────
  function attachSwipe(el, onNext, onPrev) {
    let x0=null, y0=null, dragging=false;
    el.addEventListener('touchstart', e => {
      const t = e.touches[0]; x0=t.clientX; y0=t.clientY; dragging=true;
    }, { passive:true });
    el.addEventListener('touchmove', e => {
      if (!dragging) return;
    }, { passive:true });
    el.addEventListener('touchend', e => {
      if (!dragging || x0===null) return;
      dragging=false;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)*1.4) {
        if (dx < 0) onNext(); else onPrev();
      }
      x0=null; y0=null;
    }, { passive:true });
  }

  // ── LIGHTBOX (tela cheia) ────────────────────────────────────
  function openLightbox(id) {
    const st = state[id]; if (!st || !st.imgs.length) return;
    lb = { id, imgs: st.imgs, idx: st.idx };
    const modals = document.getElementById('modals') || document.body;
    const box = document.createElement('div');
    box.className = 'lg-lightbox';
    box.id = 'lg_lightbox';
    box.innerHTML = `
      <div class="lg-lb-top">
        <div class="lg-lb-counter" id="lg_lb_counter">${lb.idx+1} / ${lb.imgs.length}</div>
        <button class="lg-lb-close" onclick="ListingGallery.closeLightbox()">✕</button>
      </div>
      <div class="lg-lb-stage" id="lg_lb_stage">
        <div class="lg-lb-track" id="lg_lb_track">
          ${lb.imgs.map((u,i)=>`
            <div class="lg-lb-slide">
              <img src="${esc(window.cldOptimize(u))}" id="lg_lb_img_${i}" onclick="ListingGallery._toggleZoom(${i})" alt="Foto ${i+1}">
            </div>`).join('')}
        </div>
        ${lb.imgs.length>1?`
          <button class="lg-lb-arrow lg-lb-prev" onclick="ListingGallery.lbPrev()">‹</button>
          <button class="lg-lb-arrow lg-lb-next" onclick="ListingGallery.lbNext()">›</button>
        `:''}
      </div>
      ${lb.imgs.length>1?`
        <div class="lg-lb-thumbs" id="lg_lb_thumbs">
          ${lb.imgs.map((u,i)=>`
            <div class="lg-thumb ${i===lb.idx?'active':''}" onclick="ListingGallery.lbGoTo(${i})">
              <img src="${esc(window.cldOptimize(u))}" loading="lazy">
            </div>`).join('')}
        </div>`:''}
    `;
    modals.appendChild(box);
    document.body.style.overflow = 'hidden';
    _lbApply();

    const stage = document.getElementById('lg_lb_stage');
    attachSwipe(stage, lbNext, lbPrev);

    document.addEventListener('keydown', _lbKeyHandler);
    box.addEventListener('click', e => { if (e.target === box) closeLightbox(); });
  }

  function _lbKeyHandler(e) {
    if (!lb) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') lbNext();
    else if (e.key === 'ArrowLeft') lbPrev();
  }

  function _lbApply() {
    if (!lb) return;
    const track = document.getElementById('lg_lb_track');
    if (track) track.style.transform = `translateX(-${lb.idx*100}%)`;
    const counter = document.getElementById('lg_lb_counter');
    if (counter) counter.textContent = `${lb.idx+1} / ${lb.imgs.length}`;
    document.querySelectorAll('#lg_lb_thumbs .lg-thumb').forEach((t,i)=>{
      t.classList.toggle('active', i===lb.idx);
      if (i===lb.idx) t.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
    });
    // sincroniza índice de volta no carrossel principal
    if (state[lb.id]) { state[lb.id].idx = lb.idx; _apply(lb.id); }
  }

  function lbGoTo(i) { if(!lb) return; lb.idx = ((i%lb.imgs.length)+lb.imgs.length)%lb.imgs.length; _lbApply(); }
  function lbNext()  { if(!lb) return; lbGoTo(lb.idx+1); }
  function lbPrev()  { if(!lb) return; lbGoTo(lb.idx-1); }

  function _toggleZoom(i) {
    const img = document.getElementById(`lg_lb_img_${i}`);
    if (img) img.classList.toggle('zoomed');
  }

  function closeLightbox() {
    const box = document.getElementById('lg_lightbox');
    if (box) box.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', _lbKeyHandler);
    lb = null;
  }

  // ── BADGE de contagem de fotos p/ cards de listagem ─────────
  function cardBadge(imgs) {
    if (!Array.isArray(imgs) || imgs.length <= 1) return '';
    return `<span class="lg-card-count">📷 ${imgs.length}</span>`;
  }
  function cardDots(imgs, max=5) {
    if (!Array.isArray(imgs) || imgs.length <= 1) return '';
    const n = Math.min(imgs.length, max);
    return `<span class="lg-card-dots">${Array.from({length:n}).map((_,i)=>`<span class="${i===0?'active':''}"></span>`).join('')}</span>`;
  }

  return { render, init, goTo, next, prev, openLightbox, closeLightbox, lbGoTo, lbNext, lbPrev, _toggleZoom, cardBadge, cardDots };
})();
