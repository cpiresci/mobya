#!/usr/bin/env python3
"""
Adiciona API.vehicle, API.wallet, API.notifications e API.rental ao js/api.js.
Hoje esses 4 namespaces NÃO existem no arquivo, mas são chamados diretamente em:
  - garagem.js          (API.vehicle.*)
  - wallet-page.js      (API.wallet.*)
  - notifications.js / notificacoes-page.js (API.notifications.*)
  - rental-host.js / rental-guest.js        (API.rental.*)
Isso quebra essas 4 features em produção (TypeError: Cannot read properties of undefined).
"""
import re

PATH = "js/api.js"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

anchor = "  function pollEmergency(emergencyId, onUpdate, intervalMs = 10000) {"
assert anchor in src, "Anchor 'function pollEmergency' não encontrado em api.js"

new_blocks = '''  const vehicle = {
    list:           ()       => get('/vehicles'),
    get:            (id)     => get(`/vehicles/${id}`),
    create:         (d)      => post('/vehicles', d),
    update:         (id,d)   => patch(`/vehicles/${id}`, d),
    remove:         (id)     => del(`/vehicles/${id}`),
    addMaintenance: (id,d)   => post(`/vehicles/${id}/maintenances`, d),
  };

  const wallet = {
    balance:      ()        => get('/wallet/balance'),
    transactions: (p={})    => get(`/wallet/transactions?${new URLSearchParams(p)}`),
    withdraw:     (d)       => post('/wallet/withdraw', d),
    withdrawals:  (p={})    => get(`/wallet/withdrawals?${new URLSearchParams(p)}`),
    approveSaque: (id,d)    => patch(`/wallet/withdrawals/${id}`, d),
    releasePending: ()      => post('/wallet/release-pending', {}),
  };

  const notifications = {
    list:      (p={}) => get(`/notifications?${new URLSearchParams(p)}`),
    unread:    ()      => get('/notifications/unread-count'),
    markRead:  (id)    => patch(`/notifications/${id}/read`, {}),
    markAll:   ()      => patch('/notifications/read-all', {}),
  };

  const rental = {
    createConfig:        (d)        => post('/rental/configs', d),
    configs:              (p={})    => get(`/rental/configs?${new URLSearchParams(p)}`),
    myConfigs:            (p={})    => get(`/rental/configs/mine?${new URLSearchParams(p)}`),
    getConfigByListing:   (listingId) => get(`/rental/configs/listing/${listingId}`),
    availableConfigs:     (p={})    => get(`/rental/configs/available?${new URLSearchParams(p)}`),
    getConfig:            (id)      => get(`/rental/configs/${id}`),
    updateConfig:         (id,d)    => patch(`/rental/configs/${id}`, d),
    deleteConfig:         (id)      => del(`/rental/configs/${id}`),
    previewPrice:         (p={})    => get(`/rental/preview-price?${new URLSearchParams(p)}`),
    createBooking:        (d)      => post('/rental/bookings', d),
    myBookings:            (p={})   => get(`/rental/bookings/mine?${new URLSearchParams(p)}`),
    hostBookings:          (p={})   => get(`/rental/bookings/host?${new URLSearchParams(p)}`),
    getBooking:            (id)     => get(`/rental/bookings/${id}`),
    confirmBooking:        (id)     => patch(`/rental/bookings/${id}/confirm`, {}),
    declineBooking:        (id,d)   => patch(`/rental/bookings/${id}/decline`, d||{}),
    checkinBooking:        (id)     => patch(`/rental/bookings/${id}/checkin`, {}),
    checkoutBooking:       (id)     => patch(`/rental/bookings/${id}/checkout`, {}),
    cancelBooking:         (id,d)   => patch(`/rental/bookings/${id}/cancel`, d||{}),
    cancelPaidBooking:     (id,d)   => patch(`/rental/bookings/${id}/cancel-paid`, d||{}),
    payBooking:            (id)     => post(`/rental/bookings/${id}/pay`, {}),
    mockPayBooking:        (id)     => post(`/rental/bookings/${id}/mock-pay`, {}),
  };

  function pollEmergency(emergencyId, onUpdate, intervalMs = 10000) {'''

src = src.replace(anchor, new_blocks, 1)

old_return = "  return { setToken, getToken, isAuth, get, post, put, patch, del, req: reqCompat, auth, ai, listings, emergency, monetization, pollEmergency, ping };"
new_return = "  return { setToken, getToken, isAuth, get, post, put, patch, del, req: reqCompat, auth, ai, listings, emergency, monetization, vehicle, wallet, notifications, rental, pollEmergency, ping };"
assert old_return in src, "Linha de return não encontrada (formato mudou?)"
src = src.replace(old_return, new_return, 1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: vehicle, wallet, notifications e rental adicionados a", PATH)
