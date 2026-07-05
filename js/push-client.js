// js/push-client.js
// Frente D do master prompt (Push Notifications + PWA).
window.PushClient = (() => {
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try { return await navigator.serviceWorker.register('/service-worker.js'); }
    catch (e) { console.warn('[Push] falha ao registrar service worker', e); return null; }
  }

  async function isSubscribed() {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  }

  function isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  async function subscribe() {
    if (!isSupported()) { alert('Seu navegador não suporta notificações push.'); return false; }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    const reg = await registerServiceWorker();
    if (!reg) return false;

    let publicKey;
    try {
      const r = await API.push.vapidPublicKey();
      publicKey = (r?.data || r)?.publicKey;
    } catch { publicKey = null; }
    if (!publicKey) { console.warn('[Push] VAPID public key não configurada no backend ainda.'); return false; }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = sub.toJSON();
    await API.push.subscribe({ endpoint: json.endpoint, keys: json.keys });
    return true;
  }

  async function unsubscribe() {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      try { await API.push.unsubscribe({ endpoint: sub.endpoint }); } catch {}
      await sub.unsubscribe();
    }
  }

  return { registerServiceWorker, isSubscribed, isSupported, subscribe, unsubscribe };
})();
