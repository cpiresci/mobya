import os, sys
API_FILE = "js/api.js"
if not os.path.exists(API_FILE):
    print("[ERRO] js/api.js nao encontrado"); sys.exit(1)
with open(API_FILE, "r", encoding="utf-8") as f:
    api = f.read()
RENTAL_OBJ = """
  const rental = {
    createConfig:   (d)      => post('/rental/configs', d),
    myConfigs:      (p={})   => get(`/rental/configs/mine?${new URLSearchParams(p)}`),
    getConfig:      (id)     => get(`/rental/configs/${id}`),
    getConfigByListing: (lid) => get(`/rental/configs/listing/${lid}`),
    updateConfig:   (id,d)   => patch(`/rental/configs/${id}`, d),
    deleteConfig:   (id)     => del(`/rental/configs/${id}`),
    previewPrice:   (p={})   => get(`/rental/preview-price?${new URLSearchParams(p)}`),
    createBooking:  (d)      => post('/rental/bookings', d),
    myBookings:     (p={})   => get(`/rental/bookings/mine?${new URLSearchParams(p)}`),
    hostBookings:   (p={})   => get(`/rental/bookings/host?${new URLSearchParams(p)}`),
    getBooking:     (id)     => get(`/rental/bookings/${id}`),
    confirmBooking: (id)     => patch(`/rental/bookings/${id}/confirm`, {}),
    declineBooking: (id,d)   => patch(`/rental/bookings/${id}/decline`, d||{}),
    checkinBooking: (id)     => patch(`/rental/bookings/${id}/checkin`, {}),
    checkoutBooking:(id)     => patch(`/rental/bookings/${id}/checkout`, {}),
    cancelBooking:  (id,d)   => patch(`/rental/bookings/${id}/cancel`, d||{}),
  };

"""
OLD_RETURN = "  return { setToken, getToken, isAuth, get, post, put, patch, del, req: reqCompat, auth, ai, listings, emergency, monetization, vehicle, wallet, pollEmergency, ping };"
NEW_RETURN = "  return { setToken, getToken, isAuth, get, post, put, patch, del, req: reqCompat, auth, ai, listings, emergency, monetization, vehicle, wallet, rental, pollEmergency, ping };"
if "const rental" in api:
    print("[SKIP] API.rental ja existe")
else:
    if OLD_RETURN not in api:
        print("[ERRO] ancora de return nao encontrada"); sys.exit(1)
    api = api.replace(OLD_RETURN, RENTAL_OBJ + NEW_RETURN)
    with open(API_FILE, "w", encoding="utf-8") as f:
        f.write(api)
    print("[OK] API.rental adicionado a api.js")
print("[OK] frontend patch concluido")
