#!/usr/bin/env python3
"""
Patch: integra SOSAlarm (full-screen) no dispatch-ui.js
- Lado PRESTADOR: dispatch_offer passa a abrir o alarme full-screen
  (em vez do modal centralizado antigo).
- Lado CLIENTE: startStatusPoll dispara alarme full-screen quando o
  status virar ACCEPTED, EXPIRED ou FAILED.

Uso (Termux):
  cp ~/storage/downloads/patch_sos_alarm.py .
  python3 patch_sos_alarm.py
Roda a partir da raiz do repo mobya-master (onde está a pasta js/).
"""
import sys

PATH = "js/dispatch-ui.js"

def abort(msg):
    print(f"❌ ABORT: {msg}")
    sys.exit(1)

def str_replace(path, old, new, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(old)
    if count == 0:
        abort(f"[{label}] trecho não encontrado em {path} — patch não aplicado, nada foi alterado.")
    if count > 1:
        abort(f"[{label}] trecho encontrado {count}x em {path} (esperado 1x) — ambíguo, abortando.")
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ [{label}] aplicado.")

# ── 1. Substitui o handler de dispatch_offer pra usar o SOSAlarm full-screen ──
old_1 = """    dispatchSocket.on('dispatch_offer', (offer) => {
      console.log('[Dispatch] Oferta recebida:', offer);
      _showOffer(offer);
    });"""

new_1 = """    dispatchSocket.on('dispatch_offer', (offer) => {
      console.log('[Dispatch] Oferta recebida:', offer);
      _showOfferFullScreen(offer);
    });"""

str_replace(PATH, old_1, new_1, "dispatch_offer -> full-screen")

# ── 2. Adiciona _showOfferFullScreen() logo após _showOffer (mantém fallback antigo) ──
old_2 = """  function _clearModal() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    currentOffer   = null;
    document.getElementById('dispatch-overlay')?.remove();
  }"""

new_2 = """  function _clearModal() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    currentOffer   = null;
    document.getElementById('dispatch-overlay')?.remove();
  }

  // ── Oferta via alarme full-screen (SOS real) ──────────────
  // Usa window.SOSAlarm se o módulo js/sos-alarm.js estiver carregado;
  // senão cai pro modal antigo (_showOffer) como fallback de segurança.
  const typeLabelsFS = {
    TOW:'🚛 Reboque', LOCKSMITH:'🔑 Chaveiro', FLAT_TIRE:'🔧 Pneu Furado',
    BATTERY:'🔋 Bateria', FUEL:'⛽ Combustível', ACCIDENT:'🚨 Acidente',
    OVERHEAT:'🌡️ Superaquecimento', FREIGHT:'📦 Frete',
    MECHANIC:'🔩 Mecânico', OTHER:'🛠️ Outro',
  };

  function _showOfferFullScreen(offer) {
    if (typeof window.SOSAlarm === 'undefined') {
      _showOffer(offer); // fallback se sos-alarm.js não foi incluído na página
      return;
    }
    currentOffer = offer;
    const info = [];
    if (offer.address) info.push({ label: '📍 Local', value: offer.address });
    if (offer.estimatedCost) info.push({ label: '💰 Estimativa', value: `R$ ${Number(offer.estimatedCost).toFixed(2)}` });
    if (offer.latitude && offer.longitude) {
      info.push({ label: '🗺️ Coords', value: `${Number(offer.latitude).toFixed(5)}, ${Number(offer.longitude).toFixed(5)}` });
    }

    window.SOSAlarm.show({
      mode: 'provider',
      title: '⚡ NOVA OFERTA SOS',
      subtitle: typeLabelsFS[offer.type] || offer.type,
      info,
      countdownMs: offer.timeoutMs || OFFER_TIMEOUT_MS,
      onAccept: accept,
      onReject: reject,
      onTimeout: () => {
        currentOffer = null;
        if (typeof Toast !== 'undefined') Toast.show('⏱️ Tempo esgotado — oferta expirada.', 'warn');
      },
    });
  }"""

str_replace(PATH, old_2, new_2, "_showOfferFullScreen()")

# ── 3. accept()/reject() hoje chamam _clearModal() — precisa também fechar o SOSAlarm ──
old_3 = """  async function accept() {
    if (!currentOffer) return;
    const { emergencyId } = currentOffer;
    _clearModal();"""

new_3 = """  async function accept() {
    if (!currentOffer) return;
    const { emergencyId } = currentOffer;
    _clearModal();
    window.SOSAlarm?.hide();"""

str_replace(PATH, old_3, new_3, "accept() fecha SOSAlarm")

old_4 = """  async function reject() {
    if (!currentOffer) return;
    const { emergencyId } = currentOffer;
    _clearModal();
    try {
      await API.req('POST', `/emergency/${emergencyId}/reject-offer`);"""

new_4 = """  async function reject() {
    if (!currentOffer) return;
    const { emergencyId } = currentOffer;
    _clearModal();
    window.SOSAlarm?.hide();
    try {
      await API.req('POST', `/emergency/${emergencyId}/reject-offer`);"""

str_replace(PATH, old_4, new_4, "reject() fecha SOSAlarm")

# ── 4. Lado CLIENTE: startStatusPoll dispara alarme full-screen em mudanças de status ──
old_5 = """        // Para de pollar quando encerrado
        if (['ACCEPTED','EXPIRED','FAILED'].includes(s.status)) stopStatusPoll();"""

new_5 = """        // Dispara alarme full-screen pro cliente em transições importantes
        // (só uma vez por status, via flag local pra não repetir a cada tick).
        if (s.status !== _lastAlertedStatus && window.SOSAlarm) {
          if (s.status === 'ACCEPTED') {
            window.SOSAlarm.show({
              mode: 'client-accepted',
              title: '✅ PRESTADOR CONFIRMADO',
              subtitle: 'Ajuda a caminho! Acompanhe pelo GPS.',
              info: s.acceptedProvider ? [{ label: '🧑‍🔧 Prestador', value: s.acceptedProvider }] : [],
              onClose: () => {},
            });
          } else if (s.status === 'EXPIRED' || s.status === 'FAILED') {
            window.SOSAlarm.show({
              mode: 'client-failed',
              title: '⚠️ NENHUM PRESTADOR DISPONÍVEL',
              subtitle: 'Não conseguimos confirmar um prestador a tempo.',
              onRetry: () => { if (typeof App !== 'undefined') App.navigate('emergencia'); },
            });
          }
          _lastAlertedStatus = s.status;
        }

        // Para de pollar quando encerrado
        if (['ACCEPTED','EXPIRED','FAILED'].includes(s.status)) stopStatusPoll();"""

str_replace(PATH, old_5, new_5, "client status -> SOSAlarm")

# ── 5. Declara _lastAlertedStatus e reseta em startStatusPoll ──
old_6 = """  function startStatusPoll(emergencyId, containerEl) {
    stopStatusPoll();"""

new_6 = """  let _lastAlertedStatus = null;

  function startStatusPoll(emergencyId, containerEl) {
    stopStatusPoll();
    _lastAlertedStatus = null;"""

str_replace(PATH, old_6, new_6, "_lastAlertedStatus init")

print("\n🎉 Patch aplicado com sucesso em", PATH)
print("Lembre-se de incluir <script src=\"js/sos-alarm.js\"></script> ANTES de dispatch-ui.js no index.html.")
