window.MobyaAuth = (() => {
  let user = null;

  async function init() {
    if (!API.isAuth()) {
      const refreshed = await fetch(window.MOBYA.API+'/api/v1/auth/refresh',{method:'POST',credentials:'include'}).then(r=>r.ok?r.json():null).catch(()=>null);
      if (refreshed?.data?.accessToken) API.setToken(refreshed.data.accessToken);
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
      <div class="form-field"><label>Senha</label><input id="liPass" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')MobyaAuth.doLogin('${redirect}')"></div>
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
      API.setToken(r.data.accessToken);
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

  function showRegister() {
    const c = document.getElementById('authContent');
    if (!c) return;
    c.innerHTML = `
      <h3 style="font-family:'Bebas Neue',sans-serif;font-size:1.5rem;letter-spacing:2px;margin-bottom:6px">CADASTRAR</h3>
      <p style="color:var(--muted);font-size:.82rem;margin-bottom:18px">Crie sua conta gratuita MOBYA</p>
      <div id="authErr" class="callout error" style="display:none"></div>
      <div class="form-field"><label>Nome completo</label><input id="rgName" type="text" placeholder="João Silva"></div>
      <div class="form-field"><label>Email</label><input id="rgEmail" type="email" placeholder="seu@email.com"></div>
      <div class="form-field"><label>Senha (mín. 8 caracteres)</label><input id="rgPass" type="password" placeholder="••••••••" onkeydown="if(event.key==='Enter')MobyaAuth.doRegister()"></div>
      <button class="ai-btn" style="width:100%;justify-content:center;height:42px;margin-top:4px" onclick="MobyaAuth.doRegister()"><div class="pdot"></div>CRIAR CONTA</button>
      <div style="text-align:center;margin-top:14px;font-size:.81rem;color:var(--muted)">
        Já tem conta? <button onclick="MobyaAuth.showLogin()" style="background:none;color:var(--q4);cursor:pointer;font-weight:600;border:none">Entrar</button>
      </div>`;
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
      ${[['💬','Chat IA','chat'],['📋','Meus Anúncios','meus-anuncios'],['🚨','Emergências','emergencia']].map(([i,l,p])=>`
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

  return { init, showLogin, doLogin, showRegister, doRegister, logout, closeModal, requireAuth, getUser };
})();
