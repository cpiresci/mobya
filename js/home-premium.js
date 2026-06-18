// ============================================================
// MOBYA — home-premium.js  (Super App Homepage v5.0)
// Sobrescreve Pages.renderHome() com o design ultra-premium.
// Carregar DEPOIS de pages.js e ANTES de app.js no index.html.
// Reutiliza API, App.toast, MobyaAuth e helpers já existentes.
// ============================================================

(function () {

  if (typeof window.Pages === 'undefined') {
    console.error('[MOBYA] home-premium.js: Pages não encontrado — pages.js deve carregar primeiro.');
    return;
  }

  const main = () => document.getElementById('main');

  const fmtBRL = v =>
    `R$ ${parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const ago = iso => {
    const s = Math.round((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return `${s}s atrás`;
    if (s < 3600) return `${Math.round(s / 60)}min atrás`;
    if (s < 86400) return `${Math.round(s / 3600)}h atrás`;
    return `${Math.round(s / 86400)}d atrás`;
  };
  const escHtml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ── SVG ICON LIBRARY (ultra premium orbs) ──────────────────
  const ICONS = {
    reboque: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="22" width="24" height="13" rx="3" fill="url(#hpTrk)"/>
      <path d="M28 26H36C37.1 26 38 26.9 38 28V31C38 32.1 37.1 33 36 33H28V26Z" fill="#b91c1c"/>
      <rect x="29" y="27" width="7" height="4" rx="1" fill="rgba(0,245,255,.4)"/>
      <rect x="36" y="28.5" width="2.5" height="1.5" rx=".75" fill="#fde68a"/>
      <circle cx="10" cy="35" r="4" fill="#111" stroke="#f43f5e" stroke-width="1.5"/>
      <circle cx="10" cy="35" r="2" fill="#f43f5e"/>
      <circle cx="32" cy="35" r="4" fill="#111" stroke="#f43f5e" stroke-width="1.5"/>
      <circle cx="32" cy="35" r="2" fill="#f43f5e"/>
      <path d="M38 31L42 32.5L40.5 36" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <rect x="14" y="20" width="8" height="2.5" rx="1.25" fill="rgba(255,200,0,.7)"/>
      <defs><linearGradient id="hpTrk" x1="4" y1="22" x2="28" y2="35" gradientUnits="userSpaceOnUse">
        <stop stop-color="#991b1b"/><stop offset="1" stop-color="#f43f5e"/></linearGradient></defs>
    </svg>`,
    frete: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="18" width="30" height="18" rx="3" fill="url(#hpFrt)"/>
      <path d="M34 24H42C43.1 24 44 24.9 44 26V33C44 34.1 43.1 35 42 35H34V24Z" fill="#c2410c"/>
      <rect x="35" y="25" width="7" height="7" rx="1" fill="rgba(255,255,255,.15)"/>
      <rect x="42" y="28" width="3" height="2" rx="1" fill="#fde68a"/>
      <line x1="18" y1="18" x2="18" y2="36" stroke="rgba(255,255,255,.15)" stroke-width="1"/>
      <circle cx="12" cy="36" r="4.5" fill="#111" stroke="#f97316" stroke-width="1.5"/>
      <circle cx="12" cy="36" r="2.2" fill="#f97316"/>
      <circle cx="36" cy="36" r="4.5" fill="#111" stroke="#f97316" stroke-width="1.5"/>
      <circle cx="36" cy="36" r="2.2" fill="#f97316"/>
      <defs><linearGradient id="hpFrt" x1="4" y1="18" x2="34" y2="36" gradientUnits="userSpaceOnUse">
        <stop stop-color="#9a3412"/><stop offset="1" stop-color="#ea580c"/></linearGradient></defs>
    </svg>`,
    mecanico: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <path d="M28 10C23.6 10 20 13.2 19.5 17.5L12 25C8 25 5 28 5 32C5 36 8 39 12 39C16 39 19 36 19 32L26.5 24.5C27 24.8 27.5 25 28 25C32.4 25 36 21.8 36 17.5C36 13.2 32.4 10 28 10Z" fill="url(#hpMec)" opacity=".9"/>
      <circle cx="12" cy="33" r="3.5" fill="rgba(255,255,255,.25)"/>
      <path d="M38 8L39 11L42 12L39 13L38 16L37 13L34 12L37 11L38 8Z" fill="#fbbf24" opacity=".9"/>
      <path d="M35 35L40 40" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
      <circle cx="35" cy="35" r="3" fill="#d97706"/>
      <defs><linearGradient id="hpMec" x1="5" y1="10" x2="36" y2="39" gradientUnits="userSpaceOnUse">
        <stop stop-color="#92400e"/><stop offset="1" stop-color="#fbbf24"/></linearGradient></defs>
    </svg>`,
    chaveiro: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <circle cx="18" cy="20" r="8.5" stroke="url(#hpChv)" stroke-width="2.5" fill="none"/>
      <circle cx="18" cy="20" r="5" fill="rgba(168,85,247,.3)"/>
      <circle cx="18" cy="20" r="2.5" fill="url(#hpChvI)"/>
      <path d="M24.5 23L37 36" stroke="url(#hpChv)" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M30 29L32.5 27" stroke="url(#hpChv)" stroke-width="2" stroke-linecap="round"/>
      <path d="M33 32L35.5 30" stroke="url(#hpChv)" stroke-width="2" stroke-linecap="round"/>
      <path d="M35 11L36 14L39 15L36 16L35 19L34 16L31 15L34 14L35 11Z" fill="#c084fc" opacity=".8"/>
      <defs><linearGradient id="hpChv" x1="9" y1="11" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop stop-color="#7c3aed"/><stop offset="1" stop-color="#c084fc"/></linearGradient>
      <radialGradient id="hpChvI" cx=".5" cy=".5" r=".5"><stop stop-color="#ddd6fe"/><stop offset="1" stop-color="#7c3aed"/></radialGradient></defs>
    </svg>`,
    carro: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <path d="M7 30L9.5 21C11 17 15 15 19 15H29C33 15 37 17 38.5 21L41 30V36C41 37.1 40.1 38 39 38H9C7.9 38 7 37.1 7 36V30Z" fill="url(#hpCar)"/>
      <path d="M18 15L16 26H32L30 15H18Z" fill="rgba(0,245,255,.25)"/>
      <circle cx="14" cy="38" r="5.5" fill="#0d0d20" stroke="#a855f7" stroke-width="1.8"/>
      <circle cx="14" cy="38" r="2.5" fill="url(#hpCarW)"/>
      <circle cx="34" cy="38" r="5.5" fill="#0d0d20" stroke="#a855f7" stroke-width="1.8"/>
      <circle cx="34" cy="38" r="2.5" fill="url(#hpCarW)"/>
      <rect x="8" y="28" width="7" height="3" rx="1" fill="#f59e0b" opacity=".85"/>
      <rect x="33" y="28" width="7" height="3" rx="1" fill="#f59e0b" opacity=".85"/>
      <defs><linearGradient id="hpCar" x1="7" y1="15" x2="41" y2="38" gradientUnits="userSpaceOnUse">
        <stop stop-color="#5b21b6"/><stop offset="1" stop-color="#a855f7"/></linearGradient>
      <radialGradient id="hpCarW" cx=".5" cy=".5" r=".5"><stop stop-color="#c084fc"/><stop offset="1" stop-color="#6d28d9"/></radialGradient></defs>
    </svg>`,
    aluguel: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="13" width="32" height="26" rx="4" fill="url(#hpCal)" opacity=".9"/>
      <rect x="8" y="13" width="32" height="10" rx="4" fill="url(#hpCalH)"/>
      <line x1="8" y1="24" x2="40" y2="24" stroke="rgba(0,0,0,.2)" stroke-width="1"/>
      <rect x="16" y="10" width="3" height="7" rx="1.5" fill="#0e7490"/>
      <rect x="29" y="10" width="3" height="7" rx="1.5" fill="#0e7490"/>
      <circle cx="16" cy="31" r="2" fill="rgba(0,245,255,.7)"/>
      <circle cx="24" cy="31" r="2" fill="rgba(0,245,255,.7)"/>
      <circle cx="32" cy="31" r="2" fill="rgba(0,245,255,.7)"/>
      <rect x="22" y="35" width="4" height="4" rx="2" fill="rgba(0,245,255,.4)"/>
      <defs><linearGradient id="hpCal" x1="8" y1="13" x2="40" y2="39" gradientUnits="userSpaceOnUse">
        <stop stop-color="#0c4a6e"/><stop offset="1" stop-color="#0e7490"/></linearGradient>
      <linearGradient id="hpCalH" x1="8" y1="13" x2="40" y2="23" gradientUnits="userSpaceOnUse">
        <stop stop-color="#155e75"/><stop offset="1" stop-color="#00f5ff" stop-opacity=".6"/></linearGradient></defs>
    </svg>`,
    seguro: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <path d="M24 7L10 14V24C10 31.5 16 37.5 24 40C32 37.5 38 31.5 38 24V14L24 7Z" fill="url(#hpShld)"/>
      <path d="M24 11L14 17V24C14 29.5 18.5 34 24 36.5C29.5 34 34 29.5 34 24V17L24 11Z" fill="rgba(0,0,0,.2)"/>
      <path d="M18 24.5L22 28.5L30 18.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <defs><linearGradient id="hpShld" x1="10" y1="7" x2="38" y2="40" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1e40af"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>
    </svg>`,
    financiamento: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <ellipse cx="24" cy="36" rx="12" ry="4" fill="url(#hpC1)"/>
      <rect x="12" y="29" width="24" height="7" fill="url(#hpCR1)"/>
      <ellipse cx="24" cy="29" rx="12" ry="4" fill="url(#hpC2)"/>
      <rect x="12" y="22" width="24" height="7" fill="url(#hpCR2)"/>
      <ellipse cx="24" cy="22" rx="12" ry="4" fill="url(#hpC3)"/>
      <path d="M30 10L36 10L36 16" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M24 16L36 10" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round"/>
      <defs>
        <linearGradient id="hpC1" x1="12" y1="36" x2="36" y2="40" gradientUnits="userSpaceOnUse"><stop stop-color="#047857"/><stop offset="1" stop-color="#10b981"/></linearGradient>
        <linearGradient id="hpCR1" x1="12" y1="29" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stop-color="#065f46"/><stop offset="1" stop-color="#059669"/></linearGradient>
        <linearGradient id="hpC2" x1="12" y1="29" x2="36" y2="33" gradientUnits="userSpaceOnUse"><stop stop-color="#059669"/><stop offset="1" stop-color="#34d399"/></linearGradient>
        <linearGradient id="hpCR2" x1="12" y1="22" x2="36" y2="29" gradientUnits="userSpaceOnUse"><stop stop-color="#047857"/><stop offset="1" stop-color="#10b981"/></linearGradient>
        <linearGradient id="hpC3" x1="12" y1="22" x2="36" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="#10b981"/><stop offset="1" stop-color="#6ee7b7"/></linearGradient>
      </defs>
    </svg>`,
    pecas: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <path d="M24 8L26 12H22L24 8ZM24 38L22 34H26L24 38ZM10 23L14 21V25L10 23ZM38 23L34 25V21L38 23Z" fill="url(#hpGear)" opacity=".85"/>
      <circle cx="24" cy="23" r="11" fill="none" stroke="url(#hpGear)" stroke-width="2.5"/>
      <circle cx="24" cy="23" r="6" fill="rgba(0,0,0,.4)" stroke="#fbbf24" stroke-width="1.5"/>
      <circle cx="24" cy="23" r="2.8" fill="url(#hpGearC)"/>
      <circle cx="24" cy="13" r="1.5" fill="#fbbf24"/><circle cx="24" cy="33" r="1.5" fill="#fbbf24"/>
      <circle cx="14" cy="23" r="1.5" fill="#fbbf24"/><circle cx="34" cy="23" r="1.5" fill="#fbbf24"/>
      <defs><linearGradient id="hpGear" x1="10" y1="8" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop stop-color="#b45309"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
      <radialGradient id="hpGearC" cx=".5" cy=".5" r=".5"><stop stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></radialGradient></defs>
    </svg>`,
    imoveis: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <path d="M24 9L38 22H36V38H12V22H10L24 9Z" fill="url(#hpHse)"/>
      <path d="M24 9L38 22H10L24 9Z" fill="url(#hpRoof)"/>
      <rect x="20" y="28" width="8" height="10" rx="4 4 0 0" fill="rgba(20,184,166,.5)"/>
      <rect x="13" y="25" width="5.5" height="5" rx="1" fill="rgba(20,184,166,.45)"/>
      <rect x="29.5" y="25" width="5.5" height="5" rx="1" fill="rgba(20,184,166,.45)"/>
      <defs><linearGradient id="hpHse" x1="12" y1="9" x2="36" y2="38" gradientUnits="userSpaceOnUse">
        <stop stop-color="#0f766e"/><stop offset="1" stop-color="#14b8a6"/></linearGradient>
      <linearGradient id="hpRoof" x1="10" y1="9" x2="38" y2="22" gradientUnits="userSpaceOnUse">
        <stop stop-color="#134e4a"/><stop offset="1" stop-color="#0d9488"/></linearGradient></defs>
    </svg>`,
    vistoria: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <rect x="10" y="12" width="28" height="30" rx="3" fill="url(#hpVis)"/>
      <rect x="18" y="9" width="12" height="7" rx="2" fill="#3730a3"/>
      <rect x="14" y="22" width="16" height="2" rx="1" fill="rgba(255,255,255,.5)"/>
      <rect x="14" y="27" width="12" height="1.5" rx=".75" fill="rgba(255,255,255,.25)"/>
      <circle cx="30" cy="32" r="6" fill="#312e81" stroke="url(#hpVisI)" stroke-width="2"/>
      <path d="M34 36L38 40" stroke="url(#hpVisI)" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M21 22.5L23 24.5L27 20.5" stroke="#6ee7b7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <defs><linearGradient id="hpVis" x1="10" y1="12" x2="38" y2="42" gradientUnits="userSpaceOnUse">
        <stop stop-color="#312e81"/><stop offset="1" stop-color="#4338ca"/></linearGradient>
      <linearGradient id="hpVisI" x1="24" y1="26" x2="38" y2="40" gradientUnits="userSpaceOnUse">
        <stop stop-color="#818cf8"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
    </svg>`,
    chatia: `<svg width="30" height="30" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="22" r="11" fill="url(#hpAI)"/>
      <circle cx="24" cy="22" r="4" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>
      <line x1="24" y1="11" x2="24" y2="18" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>
      <line x1="35" y1="22" x2="28" y2="22" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>
      <line x1="13" y1="22" x2="20" y2="22" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/>
      <circle cx="24" cy="22" r="2" fill="white" opacity=".8"/>
      <circle cx="24" cy="11" r="2.5" fill="#f9a8d4"/><circle cx="35" cy="22" r="2.5" fill="#f9a8d4"/><circle cx="13" cy="22" r="2.5" fill="#f9a8d4"/>
      <path d="M12 34C12 32.9 12.9 32 14 32H28C29.1 32 30 32.9 30 34V38C30 39.1 29.1 40 28 40H18L14 43V40H14C12.9 40 12 39.1 12 38V34Z" fill="rgba(236,72,153,.4)" stroke="rgba(236,72,153,.5)" stroke-width="1"/>
      <defs><radialGradient id="hpAI" cx=".5" cy=".5" r=".5"><stop stop-color="#be185d"/><stop offset="1" stop-color="#ec4899"/></radialGradient></defs>
    </svg>`,
    motos: `<svg width="28" height="28" viewBox="0 0 48 48" fill="none">
      <path d="M11 30C11 26.5 13 22 18 21L25 20L31 22L35 26L35 32H10C10 31.3 10.5 30.6 11 30Z" fill="url(#hpMoto)"/>
      <path d="M22 17C22 15 24 14 26 14C28 14 30 15 30 17V21H22V17Z" fill="url(#hpTank)"/>
      <circle cx="12" cy="33" r="5" fill="#111" stroke="#f97316" stroke-width="1.5"/>
      <circle cx="12" cy="33" r="2.5" fill="#f97316"/>
      <circle cx="34" cy="33" r="5" fill="#111" stroke="#f97316" stroke-width="1.5"/>
      <circle cx="34" cy="33" r="2.5" fill="#f97316"/>
      <defs><linearGradient id="hpMoto" x1="10" y1="20" x2="35" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#c2410c"/><stop offset="1" stop-color="#f97316"/></linearGradient>
      <linearGradient id="hpTank" x1="22" y1="14" x2="30" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#9a3412"/><stop offset="1" stop-color="#ea580c"/></linearGradient></defs>
    </svg>`,
    eletronicos: `<svg width="24" height="28" viewBox="0 0 40 48" fill="none">
      <rect x="8" y="6" width="24" height="36" rx="4" fill="url(#hpPhone)"/>
      <rect x="11" y="10" width="18" height="26" rx="2" fill="rgba(0,0,0,.5)"/>
      <rect x="16" y="39" width="8" height="1.5" rx=".75" fill="rgba(255,255,255,.35)"/>
      <path d="M22 15L18 25H21L17 35H18L22 24H19L22 15Z" fill="#10b981"/>
      <defs><linearGradient id="hpPhone" x1="8" y1="6" x2="32" y2="42" gradientUnits="userSpaceOnUse"><stop stop-color="#064e3b"/><stop offset="1" stop-color="#059669"/></linearGradient></defs>
    </svg>`,
  };

  // Os ícones acima usam IDs fixos em <defs> (gradientes). Como o mesmo ícone
  // pode aparecer em mais de um lugar da página (ex: "reboque" no card SOS E
  // no grid de serviços), precisamos sufixar os IDs por instância para evitar
  // <linearGradient id="x"> duplicado no DOM (inválido em HTML).
  let __iconUid = 0;
  function icon(name) {
    const raw = ICONS[name];
    if (!raw) return '';
    const suffix = '_u' + (__iconUid++);
    // Substitui id="hpXxx" -> id="hpXxx_uN" e url(#hpXxx) -> url(#hpXxx_uN)
    return raw.replace(/(id=")([A-Za-z0-9]+)(")|(url\(#)([A-Za-z0-9]+)(\))/g,
      (m, p1, p2, p3, p4, p5, p6) => p1 ? `${p1}${p2}${suffix}${p3}` : `${p4}${p5}${suffix}${p6}`);
  }

  // Mini SVG ilustração para os cards de classificados (cor variável)
  function carIllustration(grad1, grad2, wheelColor) {
    return `<svg width="100" height="72" viewBox="0 0 140 80" fill="none">
      <path d="M12 54L18 34C21 26 28 22 36 22H104C112 22 119 26 122 34L128 54V64H12V54Z" fill="${grad1}"/>
      <path d="M36 22L32 40H108L104 22H36Z" fill="rgba(0,245,255,.2)"/>
      <circle cx="28" cy="64" r="11" fill="#0d0d20" stroke="${wheelColor}" stroke-width="2.5"/>
      <circle cx="28" cy="64" r="5.5" fill="${wheelColor}"/>
      <circle cx="112" cy="64" r="11" fill="#0d0d20" stroke="${wheelColor}" stroke-width="2.5"/>
      <circle cx="112" cy="64" r="5.5" fill="${wheelColor}"/>
      <rect x="14" y="46" width="12" height="5" rx="1.5" fill="#fbbf24" opacity=".9"/>
      <rect x="114" y="46" width="12" height="5" rx="1.5" fill="#fbbf24" opacity=".9"/>
    </svg>`;
  }

  // ── SERVICES CONFIG (o "super app" — 99/Uber/iFood dos reboques) ──
  const SERVICES = [
    { page: 'reboque',       icon: 'reboque',       label: 'Reboque',       cls: 'hp-oc-red'    },
    { page: 'fretes',        icon: 'frete',         label: 'Frete',         cls: 'hp-oc-orange' },
    { page: 'servicos',      icon: 'mecanico',      label: 'Mecânico',      cls: 'hp-oc-gold'   },
    { page: 'chaveiro',      icon: 'chaveiro',      label: 'Chaveiro',      cls: 'hp-oc-purple' },
    { page: 'classificados', icon: 'carro',         label: 'Comprar Carro', cls: 'hp-oc-purple' },
    { page: 'aluguel',       icon: 'aluguel',       label: 'Aluguel',       cls: 'hp-oc-cyan'   },
    { page: 'seguros',       icon: 'seguro',        label: 'Seguro',        cls: 'hp-oc-blue'   },
    { page: 'financiamento', icon: 'financiamento', label: 'Financ.',       cls: 'hp-oc-green'  },
    { page: 'pecas',         icon: 'pecas',         label: 'Peças',         cls: 'hp-oc-gold'   },
    { page: 'vistoria',      icon: 'vistoria',      label: 'Vistoria',      cls: 'hp-oc-indigo' },
    { page: 'chat',          icon: 'chatia',        label: 'Chat IA',       cls: 'hp-oc-pink'   },
  ];

  function svcOrb(svc) {
    return `
      <div class="hp-svc-item" onclick="renderPage('${svc.page}')">
        <div class="hp-orb ${svc.cls}">
          <div class="hp-orb-bg"></div>
          ${icon(svc.icon)}
        </div>
        <span class="hp-svc-lbl">${svc.label}</span>
      </div>`;
  }

  // ── RENDER HOME PREMIUM ─────────────────────────────────────
  async function renderHomePremium() {
    const el = main();
    if (!el) return;

    el.innerHTML = `
      <div class="hp-wrap hp-fu">

        <!-- HERO -->
        <section class="hp-hero">
          <div class="hp-eyebrow">O Super App do Mundo Automotivo</div>
          <h1 class="hp-title">Seu carro,<br><em>nossa inteligência.</em></h1>
          <p class="hp-sub">Compre, venda, chame reboque, contrate mecânicos, seguros e fretes — tudo com IA quântica em tempo real.</p>

          <div class="hp-srch">
            <div class="hp-srch-ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input type="text" id="hpSrchInput" placeholder="Buscar carros, reboques, mecânicos…" autocomplete="off">
            <button class="hp-srch-ai" title="Buscar com IA" onclick="renderPage('chat')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z" fill="white"/></svg>
            </button>
          </div>

          <div class="hp-chips" id="hpChips">
            <span class="hp-chip on">🔥 HB20 2023</span>
            <span class="hp-chip">🚗 Onix Seminovo</span>
            <span class="hp-chip">🚛 Reboque Agora</span>
            <span class="hp-chip">⚡ Elétricos</span>
            <span class="hp-chip">🔧 Mecânico</span>
            <span class="hp-chip">🏠 Comprar Apto.</span>
            <span class="hp-chip">🏍️ Motos</span>
          </div>
        </section>

        <!-- SOS QUICK CALL -->
        <div class="hp-sos" onclick="renderPage('emergencia')">
          <div class="hp-sos-row">
            <div class="hp-sos-orb">${icon('reboque')}</div>
            <div class="hp-sos-info">
              <div class="hp-sos-title">🚨 Reboque &amp; Emergência 24H</div>
              <div class="hp-sos-sub">Guincho · Chaveiro · Pane seca · Bateria · Acidente</div>
            </div>
            <div class="hp-sos-eta">~8 min<span>estimativa</span></div>
          </div>
        </div>

        <!-- SERVIÇOS -->
        <section class="hp-sec">
          <div class="hp-sec-hd">
            <span class="hp-sec-ttl">⬡ SERVIÇOS</span>
          </div>
          <div class="hp-svc-grid">
            ${SERVICES.map(svcOrb).join('')}
          </div>
        </section>

        <!-- AI BANNER -->
        <div class="hp-ai" onclick="renderPage('chat')">
          <div class="hp-ai-scan"></div>
          <div class="hp-ai-pip"><div class="hp-pip-dot"></div>NEXUS-CORE · 9 AGENTES QUÂNTICOS</div>
          <div class="hp-ai-ttl">Consulte a <em>IA do MOBYA</em></div>
          <div class="hp-ai-sub">Diagnóstico de falhas, score anti-fraude, simulação de financiamento, análise FIPE e assistência de emergência — tudo em linguagem natural.</div>
          <div class="hp-ai-agents">
            <span class="hp-ai-chip">NEXUS-CV</span>
            <span class="hp-ai-chip">NEXUS-PD</span>
            <span class="hp-ai-chip">NEXUS-SEG</span>
            <span class="hp-ai-chip">NEXUS-FIN</span>
            <span class="hp-ai-chip">NEXUS-RBQ</span>
            <span class="hp-ai-chip">NEXUS-CHV</span>
          </div>
          <button class="hp-ai-cta" onclick="event.stopPropagation();renderPage('chat')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z" fill="white"/></svg>
            Perguntar à IA
          </button>
        </div>

        <!-- STATS -->
        <div class="hp-stats">
          <div class="hp-stat s1"><div class="hp-stat-v" id="hpStatListings">…</div><div class="hp-stat-l">Anúncios ativos</div></div>
          <div class="hp-stat s2"><div class="hp-stat-v" id="hpStatProviders">9</div><div class="hp-stat-l">Agentes NEXUS</div></div>
          <div class="hp-stat s3"><div class="hp-stat-v">&lt;8min</div><div class="hp-stat-l">Guincho médio</div></div>
        </div>

        <!-- DESTAQUES — ofertas reais via API -->
        <section class="hp-sec">
          <div class="hp-sec-hd">
            <span class="hp-sec-ttl">⬡ MELHORES OFERTAS</span>
            <button class="hp-sec-lnk" onclick="renderPage('classificados')">Ver todos →</button>
          </div>
          <div class="hp-cars-scroll" id="hpCarsScroll">
            ${'<div style="width:210px;height:220px;background:var(--s2);border:1px solid var(--border);border-radius:14px;flex-shrink:0;animation:pulse 2s infinite"></div>'.repeat(4)}
          </div>
        </section>

        <!-- CATEGORIAS -->
        <section class="hp-sec">
          <div class="hp-sec-hd">
            <span class="hp-sec-ttl">⬡ EXPLORAR CATEGORIAS</span>
          </div>

          <div class="hp-cats-big">
            <div class="hp-cat-big" onclick="renderPage('classificados')">
              <div class="hp-cat-big-bg" style="background:linear-gradient(135deg,#1e1b4b,#5b21b6)"></div>
              <div class="hp-cat-big-shine"></div>
              <div class="hp-cat-big-grad"></div>
              <div class="hp-cat-big-icon">
                <svg width="58" height="50" viewBox="0 0 80 60" fill="none">
                  <path d="M6 44L10 28C12 22 17 19 24 19H56C63 19 68 22 70 28L74 44V50H6V44Z" fill="url(#bigCar)"/>
                  <path d="M24 19L21 33H59L56 19H24Z" fill="rgba(0,245,255,.2)"/>
                  <circle cx="16" cy="50" r="7" fill="#0d0d20" stroke="rgba(168,85,247,.9)" stroke-width="2"/>
                  <circle cx="16" cy="50" r="3.5" fill="#a855f7"/>
                  <circle cx="64" cy="50" r="7" fill="#0d0d20" stroke="rgba(168,85,247,.9)" stroke-width="2"/>
                  <circle cx="64" cy="50" r="3.5" fill="#a855f7"/>
                  <defs><linearGradient id="bigCar" x1="6" y1="19" x2="74" y2="50" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#3b0764"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs>
                </svg>
              </div>
              <div class="hp-cat-big-label">
                <div class="hp-cat-big-name">Autos</div>
                <div class="hp-cat-big-count" id="hpCountAutos">carregando…</div>
              </div>
            </div>

            <div class="hp-cat-big" onclick="renderPage('classificados')">
              <div class="hp-cat-big-bg" style="background:linear-gradient(135deg,#164e63,#0891b2)"></div>
              <div class="hp-cat-big-shine"></div>
              <div class="hp-cat-big-grad"></div>
              <div class="hp-cat-big-icon">
                <svg width="52" height="50" viewBox="0 0 70 60" fill="none">
                  <path d="M35 8L58 28H54V52H16V28H12L35 8Z" fill="url(#bigHse)"/>
                  <path d="M35 8L58 28H12L35 8Z" fill="url(#bigRoof)"/>
                  <rect x="29" y="36" width="12" height="16" rx="6" fill="rgba(0,245,255,.4)"/>
                  <rect x="17" y="33" width="9" height="7" rx="1.5" fill="rgba(0,245,255,.35)"/>
                  <rect x="44" y="33" width="9" height="7" rx="1.5" fill="rgba(0,245,255,.35)"/>
                  <defs><linearGradient id="bigHse" x1="16" y1="8" x2="54" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#0c4a6e"/><stop offset="1" stop-color="#0891b2"/></linearGradient>
                  <linearGradient id="bigRoof" x1="12" y1="8" x2="58" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#164e63"/><stop offset="1" stop-color="#0e7490"/></linearGradient></defs>
                </svg>
              </div>
              <div class="hp-cat-big-label">
                <div class="hp-cat-big-name">Imóveis</div>
                <div class="hp-cat-big-count">em breve</div>
              </div>
            </div>
          </div>

          <div class="hp-cats-sm">
            <div class="hp-cat-sm hp-oc-orange" onclick="comingSoon('MOTOS','🏍️')">
              <div class="hp-cat-sm-orb">${icon('motos')}</div>
              <span class="hp-cat-sm-lbl">Motos</span>
            </div>
            <div class="hp-cat-sm hp-oc-green" onclick="comingSoon('ELETRÔNICOS','📱')">
              <div class="hp-cat-sm-orb">${icon('eletronicos')}</div>
              <span class="hp-cat-sm-lbl">Eletrônicos</span>
            </div>
            <div class="hp-cat-sm hp-oc-gold" onclick="renderPage('pecas')">
              <div class="hp-cat-sm-orb">${icon('pecas')}</div>
              <span class="hp-cat-sm-lbl">Peças</span>
            </div>
            <div class="hp-cat-sm hp-oc-indigo" onclick="renderPage('vistoria')">
              <div class="hp-cat-sm-orb">${icon('vistoria')}</div>
              <span class="hp-cat-sm-lbl">Vistoria</span>
            </div>
          </div>
        </section>

        <!-- TABS: categorias / populares -->
        <section class="hp-sec">
          <div class="hp-tabs">
            <button class="hp-tab on" data-hp-tab="cats">Categorias</button>
            <button class="hp-tab" data-hp-tab="pop">Pesquisas Populares</button>
          </div>
          <div class="hp-pop-list" id="hpTabCats">
            <div class="hp-pop-row" onclick="renderPage('classificados')"><div class="hp-pop-n hot">1</div><span class="hp-pop-txt">Carros Usados e Seminovos</span><span class="hp-pop-arr">›</span></div>
            <div class="hp-pop-row" onclick="comingSoon('MOTOS','🏍️')"><div class="hp-pop-n hot">2</div><span class="hp-pop-txt">Motos</span><span class="hp-pop-arr">›</span></div>
            <div class="hp-pop-row" onclick="renderPage('pecas')"><div class="hp-pop-n hot">3</div><span class="hp-pop-txt">Peças e Acessórios Auto</span><span class="hp-pop-arr">›</span></div>
            <div class="hp-pop-row" onclick="renderPage('aluguel')"><div class="hp-pop-n">4</div><span class="hp-pop-txt">Aluguel de Veículos</span><span class="hp-pop-arr">›</span></div>
            <div class="hp-pop-row" onclick="renderPage('seguros')"><div class="hp-pop-n">5</div><span class="hp-pop-txt">Seguros</span><span class="hp-pop-arr">›</span></div>
            <div class="hp-pop-row" onclick="renderPage('financiamento')"><div class="hp-pop-n">6</div><span class="hp-pop-txt">Financiamento</span><span class="hp-pop-arr">›</span></div>
          </div>
          <div class="hp-pop-list" id="hpTabPop" style="display:none">
            <div class="hp-pop-row" onclick="renderPage('classificados')"><div class="hp-pop-n hot">1</div><span class="hp-pop-txt">HB20 2022 2023</span><span class="hp-pop-arr">🔥</span></div>
            <div class="hp-pop-row" onclick="renderPage('classificados')"><div class="hp-pop-n hot">2</div><span class="hp-pop-txt">Onix Seminovo</span><span class="hp-pop-arr">🔥</span></div>
            <div class="hp-pop-row" onclick="renderPage('reboque')"><div class="hp-pop-n hot">3</div><span class="hp-pop-txt">Reboque Urgente</span><span class="hp-pop-arr">🚨</span></div>
            <div class="hp-pop-row" onclick="renderPage('servicos')"><div class="hp-pop-n">4</div><span class="hp-pop-txt">Mecânico 24h</span><span class="hp-pop-arr">›</span></div>
            <div class="hp-pop-row" onclick="renderPage('financiamento')"><div class="hp-pop-n">5</div><span class="hp-pop-txt">Financiamento Auto</span><span class="hp-pop-arr">›</span></div>
          </div>
        </section>

        <!-- NEXUS PROVIDERS STATUS -->
        <section class="hp-sec">
          <div class="hp-sec-hd">
            <span class="hp-sec-ttl">⬡ STATUS DO MOTOR NEXUS</span>
          </div>
          <div class="hp-provs-scroll" id="hpProvidersScroll">
            ${['SambaNova', 'Cerebras', 'Gemini', 'OpenRouter'].map(p => `
              <div class="hp-prov">
                <div class="hp-prov-ico" style="background:rgba(124,58,237,.18)">⬡</div>
                <div class="hp-prov-n">${p}</div>
                <div class="hp-prov-t" id="hpProv_${p.toLowerCase()}">verificando…</div>
              </div>`).join('')}
          </div>
        </section>

      </div>
    `;

    requestAnimationFrame(() => el.querySelector('.hp-wrap')?.classList.add('vis')); setTimeout(() => el.querySelector('.hp-wrap')?.classList.add('vis'), 500);
    bindHomePremiumEvents();
    loadHomePremiumData();
  }

  function bindHomePremiumEvents() {
    // chips
    document.querySelectorAll('#hpChips .hp-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        document.querySelectorAll('#hpChips .hp-chip').forEach(c => c.classList.remove('on'));
        this.classList.add('on');
        const txt = this.textContent.replace(/[^\w\sÀ-ÿ]/gu, '').trim();
        const input = document.getElementById('hpSrchInput');
        if (input) { input.value = txt; }
      });
    });

    // search → enter goes to classificados with query
    const input = document.getElementById('hpSrchInput');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          window.__mobyaSearchQuery = input.value.trim();
          renderPage('classificados');
        }
      });
    }

    // tabs
    document.querySelectorAll('.hp-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.hp-tab').forEach(t => t.classList.remove('on'));
        this.classList.add('on');
        const target = this.dataset.hpTab;
        const catsEl = document.getElementById('hpTabCats');
        const popEl = document.getElementById('hpTabPop');
        if (catsEl) catsEl.style.display = target === 'cats' ? 'flex' : 'none';
        if (popEl) popEl.style.display = target === 'pop' ? 'flex' : 'none';
      });
    });
  }

  function carCardHtml(l) {
    const imgs = (() => { try { return JSON.parse(l.images || '[]'); } catch { return []; } })();
    const isRent = l.type === 'RENT';
    const isNew = (Date.now() - new Date(l.createdAt)) < 1000 * 60 * 60 * 24 * 3; // <3 dias
    const badgeCls = isRent ? 'hp-b-rent' : (isNew ? 'hp-b-new' : 'hp-b-sale');
    const badgeTxt = isRent ? 'ALUGUEL' : (isNew ? 'NOVO' : 'VENDA');
    const colorSets = [
      ['#3b0764', '#7c3aed', '#a855f7'],
      ['#9a3412', '#ea580c', '#f97316'],
      ['#064e3b', '#10b981', '#22d3ee'],
      ['#1e3a8a', '#2563eb', '#60a5fa'],
    ];
    const [g1, g2, wc] = colorSets[Math.abs(hashStr(l.id || l.title || '')) % colorSets.length];

    return `
      <div class="hp-car" onclick="App.navigate('listing',l.id)">
        <div class="hp-car-img" style="background:linear-gradient(135deg,${g1},${g2})">
          ${imgs[0]
            ? `<img src="${imgs[0]}" style="width:100%;height:100%;object-fit:cover;position:relative;z-index:0">`
            : carIllustration(`linear-gradient(135deg,${g1},${g2})`, g2, wc)}
          <div class="hp-car-badge ${badgeCls}">${badgeTxt}</div>
          <div class="hp-car-fav" onclick="event.stopPropagation();HomePremium.toggleFavorite('${l.id}', this)">♡</div>
        </div>
        <div class="hp-car-body">
          <div class="hp-car-brand">${escHtml(l.city || '')}${l.state ? '/' + l.state : ''}</div>
          <div class="hp-car-name">${escHtml(l.title)}</div>
          <div class="hp-car-price">${fmtBRL(l.price)}${isRent ? '<span style="font-size:.6rem">/dia</span>' : ''}</div>
          <div class="hp-car-tags">
            <span class="hp-car-tag">${ago(l.createdAt)}</span>
            ${l.aiQualityScore >= 80 ? `<span class="hp-car-tag" style="color:var(--green)">⬡ IA ${l.aiQualityScore}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return h;
  }

  function loadHomePremiumData() {
    Promise.all([
      window.API?.listings.search({ limit: 8, sort: 'recent' }).catch(() => null),
      window.API?.ai.providers().catch(() => null),
    ]).then(([listR, provR]) => {
      // Listings
      const listings = listR?.data || [];
      const carsEl = document.getElementById('hpCarsScroll');
      const statEl = document.getElementById('hpStatListings');
      const countAutos = document.getElementById('hpCountAutos');

      if (statEl) statEl.textContent = listR?.pagination?.total ? formatCompact(listR.pagination.total) : (listings.length || '0');
      if (countAutos) countAutos.textContent = listR?.pagination?.total ? `${formatCompact(listR.pagination.total)} anúncios` : `${listings.length} anúncios`;

      if (carsEl) {
        if (!listings.length) {
          carsEl.innerHTML = `<div style="color:var(--muted);font-size:.82rem;padding:30px;text-align:center;width:100%">
            Nenhum anúncio disponível ainda.
            <button onclick="Pages.showCreateListing()" style="background:none;color:var(--q4);border:none;cursor:pointer;font-weight:600;display:block;margin:8px auto 0">
              Seja o primeiro a anunciar →</button></div>`;
        } else {
          carsEl.innerHTML = listings.map(carCardHtml).join('');
        }
      }

      // Providers
      const providers = provR?.data || [];
      const statProv = document.getElementById('hpStatProviders');
      if (statProv && providers.length) statProv.textContent = providers.length;

      providers.forEach(p => {
        const elp = document.getElementById(`hpProv_${p.name.toLowerCase()}`);
        if (elp) {
          elp.textContent = p.configured ? '● Ativo' : '● Offline';
          elp.style.color = p.configured ? 'var(--green)' : 'var(--muted)';
        }
      });
      // Mark any not returned as offline (graceful)
      ['sambanova', 'cerebras', 'gemini', 'openrouter'].forEach(name => {
        const elp = document.getElementById(`hpProv_${name}`);
        if (elp && elp.textContent === 'verificando…') {
          elp.textContent = '● Offline';
          elp.style.color = 'var(--muted)';
        }
      });
    }).catch(() => {
      const carsEl = document.getElementById('hpCarsScroll');
      if (carsEl) carsEl.innerHTML = `<div style="color:var(--muted);font-size:.82rem;padding:30px">Não foi possível carregar ofertas agora.</div>`;
    });
  }

  function formatCompact(n) {
    n = parseInt(n, 10) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(n);
  }

  // ── FAVORITOS (usa API.listings.favorite já existente) ─────
  async function toggleFavorite(id, btnEl) {
    if (!window.API?.isAuth()) {
      window.MobyaAuth?.showLogin();
      return;
    }
    const wasOn = btnEl.classList.contains('on');
    btnEl.textContent = wasOn ? '♡' : '♥';
    btnEl.classList.toggle('on');
    btnEl.style.color = wasOn ? '' : 'var(--red)';
    try {
      await window.API.listings.favorite(id);
      window.App?.toast(wasOn ? 'Removido dos favoritos.' : '♥ Adicionado aos favoritos!', 'ok');
    } catch (e) {
      // revert on failure
      btnEl.textContent = wasOn ? '♥' : '♡';
      btnEl.classList.toggle('on');
      btnEl.style.color = wasOn ? 'var(--red)' : '';
      window.App?.toast(e.message || 'Erro ao favoritar.', 'err');
    }
  }

  window.HomePremium = { toggleFavorite };

  // ── OVERRIDE ─────────────────────────────────────────────────
  window.Pages.renderHome = renderHomePremium;

})();
