window.MobyaAuth = (() => {
  let user = null;

  async function init() {
    // Link de "esqueci minha senha" cai em /?reset_token=XXX — abre
    // direto a tela de nova senha, sem depender do usuário estar logado
    // (faz sentido rodar isso ANTES do fluxo normal de sessão/refresh).
    const resetToken = new URLSearchParams(window.location.search).get('reset_token');
    if (resetToken) {
      // Guard: auth.js pode ser parseado antes de showResetPassword estar definida
      if (typeof showResetPassword === 'function') {
        showResetPassword(resetToken);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (typeof showResetPassword === 'function') showResetPassword(resetToken);
        }, { once: true });
      }
    }

    if (!API.isAuth()) {
      const _tryRefresh = async (timeoutMs) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const _rt=localStorage.getItem('mobya_rt'); const r = await fetch(window.MOBYA.API+'/api/v1/auth/refresh', { method:'POST', credentials:'include', signal: ctrl.signal, headers:{'Content-Type':'application/json'}, body: _rt ? JSON.stringify({refreshToken:_rt}) : undefined });
          clearTimeout(t);
          return r.ok ? await r.json().catch(() => null) : null;
        } catch { clearTimeout(t); return null; }
      };
      let refreshed = null;
      const attempts = [8000, 15000, 25000, 30000];
      for (let i = 0; i < attempts.length && !refreshed?.data?.accessToken; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 3000 * i));
        refreshed = await _tryRefresh(attempts[i]);
      }
      if (refreshed?.data?.accessToken){ API.setToken(refreshed.data.accessToken); if(refreshed.data.refreshToken) localStorage.setItem('mobya_rt', refreshed.data.refreshToken); }
      else { updateUI(null); return false; }
    }
    try {
      const r = await API.auth.me();
      user = r.data;
      updateUI(user);
      return true;
    } catch { API.setToken(null); updateUI(null); return false; }
  }

  function updateUI(u) {
    const btn = document.getElementById('btnCta');
    if (!btn) return;
    if (u) {
      btn.textContent = u.name.split(' ')[0];
      btn.onclick = () => showUserMenu(u);
    } else {
      btn.textContent = 'Entrar';
      btn.onclick = () => showLogin();
    }
    if (typeof updateSidebarRoles === 'function') updateSidebarRoles(u);
    // Fase 4B: auto-connect dispatch para prestadores
    if (u && ['MECHANIC','SELLER','ADMIN','SUPER_ADMIN'].includes(u.role)) {
      if (typeof DispatchUI !== 'undefined') setTimeout(() => DispatchUI.connect(), 800);
    } else if (!u) {
      if (typeof DispatchUI !== 'undefined') DispatchUI.disconnect();
    }
  }

  // ── Campo de senha com botão de mostrar/ocultar embutido ──────
  // id: id do <input>. Gera o wrapper + o botão de olho (SVG inline,
  // sem dependência externa). toggle() troca type text<->password e
  // o ícone aberto/fechado.
  function pwdFieldHTML({ id, label, placeholder = '••••••••', autocomplete = 'current-password', onEnter = '', hint = '' }) {
    const enterAttr = onEnter ? ` onkeydown="if(event.key==='Enter'){${onEnter}}"` : '';
    return `
      <div class="form-field">
        <label>${label}</label>
        <div class="pwd-field-wrap">
          <input id="${id}" type="password" placeholder="${placeholder}" autocomplete="${autocomplete}"${enterAttr}>
          <button type="button" class="pwd-toggle" aria-label="Mostrar senha" onclick="MobyaAuth.togglePwd('${id}', this)">
            ${eyeIcon(false)}
          </button>
        </div>
        ${hint ? `<div style="font-size:.7rem;color:var(--muted);margin-top:5px">${hint}</div>` : ''}
      </div>`;
  }

  function eyeIcon(open) {
    // open=true → olho "aberto" (senha visível, ícone de olho riscado pra indicar "ocultar")
    return open
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  function togglePwd(id, btn) {
    const input = document.getElementById(id);
    if (!input) return;
    const willShow = input.type === 'password';
    input.type = willShow ? 'text' : 'password';
    btn.innerHTML = eyeIcon(willShow);
    btn.setAttribute('aria-label', willShow ? 'Ocultar senha' : 'Mostrar senha');
  }

  // ── Indicador de força de senha ────────────────────────────────
  // Heurística simples (sem libs externas): pontua por comprimento +
  // variedade de classes de caractere. 4 níveis: fraca/razoável/boa/forte.
  function pwdStrength(pwd) {
    if (!pwd) return { score: 0, label: '', cls: '' };
    let score = 0;
    if (pwd.length >= 4)  score++;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    const hasLower  = /[a-z]/.test(pwd);
    const hasUpper  = /[A-Z]/.test(pwd);
    const hasDigit  = /\d/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    // Pontua por VARIEDADE de classes de caractere, não só tamanho —
    // assim "12345678901234" (14 dígitos repetidos) não pontua tão alto
    // quanto uma senha curta mas misturada.
    if (variety >= 2) score++;
    if (variety >= 3) score++;
    if (hasSymbol) score++;
    // Piso: qualquer senha não-vazia mostra pelo menos "Fraca" — sem
    // isso, alguém digitando os primeiros 1-3 caracteres não via
    // nenhum feedback visual até bater o primeiro critério de tamanho.
    score = Math.max(1, Math.min(score, 4));
    const levels = [
      { label: '', cls: '' },
      { label: 'Fraca', cls: 'weak' },
      { label: 'Razoável', cls: 'fair' },
      { label: 'Boa', cls: 'good' },
      { label: 'Forte', cls: 'strong' },
    ];
    return { score, ...levels[score] };
  }

  function pwdStrengthHTML() {
    return `
      <div class="pwd-strength" id="pwdStrengthBox" style="display:none">
        <div class="pwd-strength-bar">
          ${[0,1,2,3].map(i => `<div class="pwd-strength-seg" data-seg="${i}"></div>`).join('')}
        </div>
        <div class="pwd-strength-label" id="pwdStrengthLabel"></div>
      </div>`;
  }

  function updatePwdStrength(inputId) {
    const input = document.getElementById(inputId);
    const box   = document.getElementById('pwdStrengthBox');
    const label = document.getElementById('pwdStrengthLabel');
    if (!input || !box || !label) return;
    const pwd = input.value || '';
    if (!pwd) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    const { score, cls, label: text } = pwdStrength(pwd);
    box.querySelectorAll('.pwd-strength-seg').forEach((seg, i) => {
      seg.classList.toggle('on', i < score);
      seg.className = `pwd-strength-seg${i < score ? ' on ' + cls : ''}`;
    });
    label.textContent = text;
    label.className = `pwd-strength-label ${cls}`;
  }

  function showLogin(redirect='') {
    const m = document.getElementById('authModal');
    const c = document.getElementById('authContent');
    if (!m||!c) return;
    c.innerHTML = `
      <h3 style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:2px;margin-bottom:6px">ENTRAR</h3>
      <p style="color:var(--muted);font-size:.82rem;margin-bottom:18px">Acesse sua conta MOBYA</p>
      <div id="authErr" class="callout error" style="display:none"></div>
      <div class="form-field"><label>Email</label><input id="liEmail" type="email" placeholder="seu@email.com" autocomplete="email"></div>
      ${pwdFieldHTML({ id:'liPass', label:'Senha', autocomplete:'current-password', onEnter:`MobyaAuth.doLogin('${redirect}')` })}
      <button type="button" class="auth-forgot-link" onclick="MobyaAuth.showForgotPassword()">Esqueci minha senha</button>
      <button class="ai-btn" style="width:100%;justify-content:center;height:42px;margin-top:4px" onclick="MobyaAuth.doLogin('${redirect}')"><div class="pdot"></div>ENTRAR</button>
      <div style="text-align:center;margin-top:14px;font-size:.81rem;color:var(--muted)">
        Não tem conta? <button onclick="MobyaAuth.showRegister()" style="background:none;color:var(--q4);cursor:pointer;font-weight:600;border:none">Cadastre-se</button>
      </div>`;
    m.classList.add('open');
    setTimeout(() => document.getElementById('liEmail')?.focus(), 100);
  }

  async function doLogin(redirect='') {
    const email = document.getElementById('liEmail')?.value?.trim();
    const pass  = document.getElementById('liPass')?.value;
    if (!email||!pass) return showAuthErr('Preencha email e senha.');
    const btn = document.querySelector('#authContent .ai-btn');
    if (btn) { btn.disabled=true; btn.innerHTML='<div class="pdot"></div>ENTRANDO...'; }
    try {
      const r = await API.auth.login({ email, password: pass });
      API.setToken(r.data.accessToken); if(r.data.refreshToken) localStorage.setItem('mobya_rt', r.data.refreshToken);
      user = r.data.user;
      updateUI(user);
      closeModal();
      Toast.show(`Bem-vindo, ${user.name.split(' ')[0]}! ⚡`, 'ok');
      if (redirect) App.navigate(redirect);
    } catch(e) {
      showAuthErr(e.message||'Erro ao entrar.');
      if (btn) { btn.disabled=false; btn.innerHTML='<div class="pdot"></div>ENTRAR'; }
    }
  }

  // ── ESQUECI MINHA SENHA — pede o email, backend manda o link ──
  function showForgotPassword() {
    const c = document.getElementById('authContent');
    if (!c) return;
    c.innerHTML = `
      <h3 style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:2px;margin-bottom:6px">RECUPERAR SENHA</h3>
      <p style="color:var(--muted);font-size:.82rem;margin-bottom:18px">Informe seu email e enviaremos um link para redefinir sua senha.</p>
      <div id="authErr" class="callout error" style="display:none"></div>
      <div id="authOk" class="callout ok" style="display:none"></div>
      <div class="form-field"><label>Email</label><input id="fpEmail" type="email" placeholder="seu@email.com" autocomplete="email" onkeydown="if(event.key==='Enter')MobyaAuth.doForgotPassword()"></div>
      <button class="ai-btn" id="fpBtn" style="width:100%;justify-content:center;height:42px;margin-top:4px" onclick="MobyaAuth.doForgotPassword()"><div class="pdot"></div>ENVIAR LINK</button>
      <div style="text-align:center;margin-top:14px;font-size:.81rem;color:var(--muted)">
        <button onclick="MobyaAuth.showLogin()" style="background:none;color:var(--q4);cursor:pointer;font-weight:600;border:none">← Voltar para o login</button>
      </div>`;
    setTimeout(() => document.getElementById('fpEmail')?.focus(), 100);
  }

  async function doForgotPassword() {
    const email = document.getElementById('fpEmail')?.value?.trim();
    if (!email) return showAuthErr('Informe seu email.');
    const btn = document.getElementById('fpBtn');
    if (btn) { btn.disabled=true; btn.innerHTML='<div class="pdot"></div>ENVIANDO...'; }
    try {
      const r = await API.auth.forgotPassword({ email });
      const okEl = document.getElementById('authOk');
      const errEl = document.getElementById('authErr');
      if (errEl) errEl.style.display = 'none';
      if (okEl) {
        okEl.textContent = `✅ ${r.message || 'Se o email existir em nossa base, enviamos um link de redefinição.'}`;
        okEl.style.display = 'block';
      }
      if (btn) { btn.disabled=true; btn.innerHTML='<div class="pdot"></div>LINK ENVIADO'; }
    } catch(e) {
      showAuthErr(e.message||'Erro ao solicitar redefinição.');
      if (btn) { btn.disabled=false; btn.innerHTML='<div class="pdot"></div>ENVIAR LINK'; }
    }
  }

  // ── REDEFINIR SENHA — chamado quando a página abre com ?reset_token= ──
  function showResetPassword(token) {
    const m = document.getElementById('authModal');
    const c = document.getElementById('authContent');
    if (!m||!c) return;
    c.innerHTML = `
      <h3 style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:2px;margin-bottom:6px">NOVA SENHA</h3>
      <p style="color:var(--muted);font-size:.82rem;margin-bottom:18px">Escolha uma nova senha para sua conta MOBYA.</p>
      <div id="authErr" class="callout error" style="display:none"></div>
      ${pwdFieldHTML({ id:'rpPass', label:'Nova senha (mín. 8 caracteres)', autocomplete:'new-password' })}
      ${pwdStrengthHTML()}
      ${pwdFieldHTML({ id:'rpPass2', label:'Confirme a nova senha', autocomplete:'new-password', onEnter:'MobyaAuth.doResetPassword()' })}
      <button class="ai-btn" id="rpBtn" style="width:100%;justify-content:center;height:42px;margin-top:14px" onclick="MobyaAuth.doResetPassword()"><div class="pdot"></div>REDEFINIR SENHA</button>`;
    m.classList.add('open');
    m.dataset.resetToken = token;
    document.getElementById('rpPass')?.addEventListener('input', () => updatePwdStrength('rpPass'));
    setTimeout(() => document.getElementById('rpPass')?.focus(), 100);
  }

  async function doResetPassword() {
    const m = document.getElementById('authModal');
    const token = m?.dataset?.resetToken;
    const pass  = document.getElementById('rpPass')?.value;
    const pass2 = document.getElementById('rpPass2')?.value;
    if (!token) return showAuthErr('Link de redefinição inválido. Solicite um novo.');
    if (!pass || !pass2) return showAuthErr('Preencha os dois campos de senha.');
    if (pass.length < 8) return showAuthErr('Senha deve ter mínimo 8 caracteres.');
    if (pass !== pass2) return showAuthErr('As senhas não coincidem.');
    const btn = document.getElementById('rpBtn');
    if (btn) { btn.disabled=true; btn.innerHTML='<div class="pdot"></div>REDEFININDO...'; }
    try {
      await API.auth.resetPassword({ token, newPassword: pass });
      closeModal();
      // Limpa o token da URL pra não reabrir o formulário num refresh
      if (window.history?.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('reset_token');
        window.history.replaceState({}, '', url);
      }
      Toast.show('Senha redefinida com sucesso! Faça login. 🔐', 'ok', 6000);
      showLogin();
    } catch(e) {
      showAuthErr(e.message||'Link inválido ou expirado. Solicite uma nova redefinição.');
      if (btn) { btn.disabled=false; btn.innerHTML='<div class="pdot"></div>REDEFINIR SENHA'; }
    }
  }

  function showRegister() {
    const c = document.getElementById('authContent');
    if (!c) return;
    c.innerHTML = `
      <h3 style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:2px;margin-bottom:6px">CADASTRAR</h3>
      <p style="color:var(--muted);font-size:.82rem;margin-bottom:18px">Crie sua conta gratuita MOBYA</p>
      <div id="authErr" class="callout error" style="display:none"></div>
      <div class="form-field"><label>Nome completo</label><input id="rgName" type="text" placeholder="João Silva"></div>
      <div class="form-field"><label>Email</label><input id="rgEmail" type="email" placeholder="seu@email.com"></div>
      ${pwdFieldHTML({ id:'rgPass', label:'Senha (mín. 8 caracteres)', autocomplete:'new-password', onEnter:'MobyaAuth.doRegister()' })}
      ${pwdStrengthHTML()}
      <button class="ai-btn" style="width:100%;justify-content:center;height:42px;margin-top:4px" onclick="MobyaAuth.doRegister()"><div class="pdot"></div>CRIAR CONTA</button>
      <div style="text-align:center;margin-top:14px;font-size:.81rem;color:var(--muted)">
        Já tem conta? <button onclick="MobyaAuth.showLogin()" style="background:none;color:var(--q4);cursor:pointer;font-weight:600;border:none">Entrar</button>
      </div>`;
    document.getElementById('rgPass')?.addEventListener('input', () => updatePwdStrength('rgPass'));
  }

  async function doRegister() {
    const name  = document.getElementById('rgName')?.value?.trim();
    const email = document.getElementById('rgEmail')?.value?.trim();
    const pass  = document.getElementById('rgPass')?.value;
    if (!name||!email||!pass) return showAuthErr('Preencha todos os campos.');
    if (pass.length < 8) return showAuthErr('Senha deve ter mínimo 8 caracteres.');
    const btn = document.querySelector('#authContent .ai-btn');
    if (btn) { btn.disabled=true; btn.innerHTML='<div class="pdot"></div>CRIANDO...'; }
    try {
      await API.auth.register({ name, email, password: pass });
      closeModal();
      Toast.show('Conta criada! Faça login para continuar. ✅', 'ok', 5000);
      showLogin();
    } catch(e) {
      showAuthErr(e.message||'Erro ao criar conta.');
      if (btn) { btn.disabled=false; btn.innerHTML='<div class="pdot"></div>CRIAR CONTA'; }
    }
  }

  function showUserMenu(u) {
    const ex = document.getElementById('userDrop');
    if (ex) { ex.remove(); return; }
    const d = document.createElement('div');
    d.id = 'userDrop';
    d.style.cssText = 'position:fixed;top:64px;right:24px;z-index:300;background:var(--s2);border:1px solid var(--border2);border-radius:12px;padding:12px;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:mBox .2s ease';
    d.innerHTML = `
      <div style="padding:8px 10px;border-bottom:1px solid var(--border);margin-bottom:8px">
        <div style="font-weight:600;font-size:.9rem">${u.name}</div>
        <div style="font-size:.73rem;color:var(--muted)">${u.email}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:.58rem;color:var(--q4);margin-top:2px">${u.role}</div>
      </div>
      ${[['📊','Central Mobya','dashboard'],['💬','Chat IA','chat'],['🚨','Emergências','emergencia']].map(([i,l,p])=>`
        <button onclick="App.navigate('${p}');document.getElementById('userDrop')?.remove()" style="display:flex;align-items:center;gap:8px;width:100%;background:none;color:var(--muted);padding:8px 10px;border-radius:6px;font-family:'Space Grotesk',sans-serif;font-size:.82rem;cursor:pointer;border:none;transition:all .15s" onmouseover="this.style.background='rgba(124,58,237,.1)';this.style.color='var(--text)'" onmouseout="this.style.background='none';this.style.color='var(--muted)'">${i} ${l}</button>`).join('')}
      <button onclick="MobyaAuth.logout()" style="display:flex;align-items:center;gap:8px;width:100%;background:none;color:var(--red);padding:8px 10px;border-radius:6px;font-family:'Space Grotesk',sans-serif;font-size:.82rem;cursor:pointer;border:none;margin-top:4px">🚪 Sair</button>`;
    document.body.appendChild(d);
    setTimeout(() => document.addEventListener('click', function h(e) { if (!d.contains(e.target)) { d.remove(); document.removeEventListener('click',h); } }), 100);
  }

  async function logout() {
    try { await API.auth.logout(); } catch {}
    API.setToken(null);
    user = null;
    updateUI(null);
    App.navigate('home');
    Toast.show('Até logo! 👋', 'info');
  }

  function showAuthErr(msg) {
    const el = document.getElementById('authErr');
    if (el) { el.textContent = `⚠️ ${msg}`; el.style.display = 'block'; }
  }

  function closeModal() {
    document.getElementById('authModal')?.classList.remove('open');
  }

  function requireAuth(cb, redirect='') {
    if (API.isAuth()) { cb(); return; }
    showLogin(redirect);
  }

  function getUser() { return user; }

  window.addEventListener('mobya:logout', () => { user=null; updateUI(null); Toast.show('Sessão expirada. Faça login novamente.','warn'); showLogin(); });

  return {
    init, showLogin, doLogin, showRegister, doRegister, logout, closeModal, requireAuth, getUser,
    showForgotPassword, doForgotPassword, showResetPassword, doResetPassword,
    togglePwd,
  };
})();
