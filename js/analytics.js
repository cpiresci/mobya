// js/analytics.js
// Frente F do master prompt (Analytics). Wrapper único pra GA4 + Meta Pixel
// — o resto do código chama só Analytics.track(...), sem precisar saber se
// GA4/Pixel estão configurados ou não. Enquanto window.MOBYA.GA4_ID e
// window.MOBYA.META_PIXEL_ID estiverem vazios (ver index.html), os scripts
// nem carregam e todo track() vira no-op silencioso — seguro pra já estar
// em produção antes mesmo de você criar as contas.
window.Analytics = (() => {
  function track(eventName, params = {}) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
      }
    } catch (e) { /* nunca deixa analytics quebrar o fluxo principal */ }

    try {
      if (typeof window.fbq === 'function') {
        // Meta Pixel usa nomes de evento próprios pros eventos padrão —
        // mapeamos os principais; eventos sem mapeamento viram "trackCustom".
        const metaMap = {
          sign_up: 'CompleteRegistration',
          login: null, // Meta não tem evento padrão de login; não envia
          view_item: 'ViewContent',
          begin_checkout: 'InitiateCheckout',
          purchase: 'Purchase',
        };
        const metaEvent = metaMap[eventName];
        if (metaEvent) {
          const metaParams = {};
          if (params.value !== undefined) metaParams.value = params.value;
          if (params.currency) metaParams.currency = params.currency;
          if (params.item_id) metaParams.content_ids = [params.item_id];
          if (params.item_name) metaParams.content_name = params.item_name;
          window.fbq('track', metaEvent, metaParams);
        } else if (eventName !== 'login') {
          window.fbq('trackCustom', eventName, params);
        }
      }
    } catch (e) { /* idem */ }
  }

  return { track };
})();
