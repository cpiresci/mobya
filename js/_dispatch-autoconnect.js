
// ── Auto-conecta Dispatch se usuário for MECHANIC ou SELLER ──
(function() {
  function _tryConnectDispatch() {
    try {
      const raw = localStorage.getItem('mobya_user') || sessionStorage.getItem('mobya_user');
      if (!raw) return;
      const user = JSON.parse(raw);
      if (['MECHANIC','SELLER','ADMIN','SUPER_ADMIN'].includes(user?.role)) {
        if (typeof DispatchUI !== 'undefined') DispatchUI.connect();
      }
    } catch {}
  }
  // Tenta ao carregar e também quando o app navegar (após login)
  document.addEventListener('DOMContentLoaded', () => setTimeout(_tryConnectDispatch, 1500));
  window.addEventListener('mobya:auth', () => setTimeout(_tryConnectDispatch, 500));
})();
