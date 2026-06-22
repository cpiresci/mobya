// src/routes/rental.routes.js
import { Router } from 'express';
import { prisma } from '../config/database.js';
import { ApiError, R } from '../utils/ApiError.js';
import { authenticate } from '../middleware/auth.js';
import { calcRentalPrice } from '../services/rental-pricing.service.js';

const router = Router();

async function assertConfigOwner(configId, userId) {
  const cfg = await prisma.rentalVehicleConfig.findUnique({ where: { id: configId } });
  if (!cfg) throw ApiError.notFound('Configuração de aluguel');
  if (cfg.hostId !== userId) throw ApiError.forbidden();
  return cfg;
}

async function assertBookingParty(bookingId, userId) {
  const b = await prisma.rentalBooking.findUnique({ where: { id: bookingId } });
  if (!b) throw ApiError.notFound('Reserva');
  if (b.renterId !== userId && b.hostId !== userId)
    throw ApiError.forbidden('Você não faz parte desta reserva.');
  return b;
}

router.post('/configs', authenticate, async (req, res, next) => {
  try {
    const { listingId, protectionPlan, dailyRate, weeklyRate, monthlyRate,
      includedKmPerDay, extraKmFee, deposit, minRentalDays, maxRentalDays,
      instantBook, advanceNoticeHrs, pickupLat, pickupLng, pickupAddress } = req.body;
    if (!listingId) throw ApiError.badRequest('listingId é obrigatório.');
    if (!dailyRate || parseFloat(dailyRate) <= 0)
      throw ApiError.badRequest('dailyRate deve ser maior que zero.');
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw ApiError.notFound('Anúncio');
    if (listing.userId !== req.user.id)
      throw ApiError.forbidden('Apenas o dono do anúncio pode configurar aluguel.');
    const data = {
      hostId: req.user.id,
      protectionPlan: protectionPlan || 'STANDARD',
      dailyRate: parseFloat(dailyRate),
      weeklyRate: weeklyRate ? parseFloat(weeklyRate) : null,
      monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
      includedKmPerDay: parseInt(includedKmPerDay ?? 200),
      extraKmFee: parseFloat(extraKmFee ?? 1.20),
      deposit: parseFloat(deposit ?? 0),
      minRentalDays: parseInt(minRentalDays ?? 1),
      maxRentalDays: parseInt(maxRentalDays ?? 30),
      instantBook: Boolean(instantBook),
      advanceNoticeHrs: parseInt(advanceNoticeHrs ?? 2),
      pickupLat: pickupLat ? parseFloat(pickupLat) : null,
      pickupLng: pickupLng ? parseFloat(pickupLng) : null,
      pickupAddress: pickupAddress || null,
      active: true,
    };
    const cfg = await prisma.rentalVehicleConfig.upsert({
      where: { listingId },
      create: { listingId, ...data },
      update: data,
    });
    R.created(res, cfg, 'Configuração de aluguel salva!');
  } catch (e) { next(e); }
});

router.get('/configs/mine', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const where = { hostId: req.user.id };
    const [total, configs] = await Promise.all([
      prisma.rentalVehicleConfig.count({ where }),
      prisma.rentalVehicleConfig.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { listing: { select: { id: true, title: true, type: true, images: true } } },
      }),
    ]);
    R.paginated(res, configs, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (e) { next(e); }
});

router.get('/configs/listing/:listingId', async (req, res, next) => {
  try {
    const cfg = await prisma.rentalVehicleConfig.findUnique({
      where: { listingId: req.params.listingId },
      include: { host: { select: { id: true, name: true, avatar: true } } },
    });
    if (!cfg) throw ApiError.notFound('Configuração de aluguel');
    R.ok(res, cfg);
  } catch (e) { next(e); }
});


// GET /api/v1/rental/configs/available
// Busca configs ativos sem conflito de reserva no período solicitado.
// Usado pela página de busca do locatário (pages-extra.js renderAluguel).
router.get('/configs/available', async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 20, page = 1 } = req.query;
    if (!startDate || !endDate) throw ApiError.badRequest('startDate e endDate são obrigatórios.');
    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw ApiError.badRequest('Datas inválidas.');
    if (end <= start) throw ApiError.badRequest('endDate deve ser depois de startDate.');

    // IDs de configs que têm conflito de reserva no período
    const conflictingBookings = await prisma.rentalBooking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] },
        AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
      },
      select: { configId: true },
    });
    const blockedConfigIds = [...new Set(conflictingBookings.map(b => b.configId))];

    const where = {
      active: true,
      ...(blockedConfigIds.length ? { id: { notIn: blockedConfigIds } } : {}),
    };

    const [total, configs] = await Promise.all([
      prisma.rentalVehicleConfig.count({ where }),
      prisma.rentalVehicleConfig.findMany({
        where,
        skip:    (parseInt(page) - 1) * parseInt(limit),
        take:    parseInt(limit),
        orderBy: { dailyRate: 'asc' },
        include: {
          listing: { select: { id: true, title: true, images: true, city: true, state: true, description: true } },
          host:    { select: { id: true, name: true, avatar: true } },
        },
      }),
    ]);

    R.paginated(res, configs, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (e) { next(e); }
});

router.get('/configs/:id', async (req, res, next) => {
  try {
    const cfg = await prisma.rentalVehicleConfig.findUnique({
      where: { id: req.params.id },
      include: {
        listing: { select: { id: true, title: true, type: true, images: true, city: true, state: true, description: true } },
        host: { select: { id: true, name: true, avatar: true, createdAt: true } },
      },
    });
    if (!cfg) throw ApiError.notFound('Configuração de aluguel');
    R.ok(res, cfg);
  } catch (e) { next(e); }
});

router.patch('/configs/:id', authenticate, async (req, res, next) => {
  try {
    await assertConfigOwner(req.params.id, req.user.id);
    const allowed = ['protectionPlan','dailyRate','weeklyRate','monthlyRate',
      'includedKmPerDay','extraKmFee','deposit','minRentalDays','maxRentalDays',
      'instantBook','advanceNoticeHrs','pickupLat','pickupLng','pickupAddress','active'];
    const data = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (['dailyRate','weeklyRate','monthlyRate','extraKmFee','deposit','pickupLat','pickupLng'].includes(k))
          data[k] = req.body[k] !== null ? parseFloat(req.body[k]) : null;
        else if (['includedKmPerDay','minRentalDays','maxRentalDays','advanceNoticeHrs'].includes(k))
          data[k] = parseInt(req.body[k]);
        else if (k === 'instantBook') data[k] = Boolean(req.body[k]);
        else data[k] = req.body[k];
      }
    }
    const updated = await prisma.rentalVehicleConfig.update({ where: { id: req.params.id }, data });
    R.ok(res, updated, 'Configuração atualizada.');
  } catch (e) { next(e); }
});

router.delete('/configs/:id', authenticate, async (req, res, next) => {
  try {
    await assertConfigOwner(req.params.id, req.user.id);
    await prisma.rentalVehicleConfig.update({ where: { id: req.params.id }, data: { active: false } });
    R.noContent(res);
  } catch (e) { next(e); }
});

router.get('/preview-price', async (req, res, next) => {
  try {
    const { configId, startDate, endDate } = req.query;
    if (!configId || !startDate || !endDate)
      throw ApiError.badRequest('configId, startDate e endDate são obrigatórios.');
    const cfg = await prisma.rentalVehicleConfig.findUnique({ where: { id: configId } });
    if (!cfg) throw ApiError.notFound('Configuração de aluguel');
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days <= 0) throw ApiError.badRequest('Intervalo de datas inválido.');
    const pricing = calcRentalPrice({ dailyRate: cfg.dailyRate, days, protectionPlan: cfg.protectionPlan });
    R.ok(res, { days, ...pricing });
  } catch (e) { next(e); }
});

router.post('/bookings', authenticate, async (req, res, next) => {
  try {
    const { configId, startDate, endDate } = req.body;
    if (!configId || !startDate || !endDate)
      throw ApiError.badRequest('configId, startDate e endDate são obrigatórios.');
    const cfg = await prisma.rentalVehicleConfig.findUnique({ where: { id: configId } });
    if (!cfg) throw ApiError.notFound('Configuração de aluguel');
    if (!cfg.active) throw ApiError.conflict('Veículo indisponível para aluguel no momento.');
    if (cfg.hostId === req.user.id) throw ApiError.badRequest('Você não pode reservar seu próprio veículo.');
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw ApiError.badRequest('Datas inválidas.');
    if (end <= start) throw ApiError.badRequest('endDate deve ser depois de startDate.');
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days < cfg.minRentalDays) throw ApiError.badRequest(`Mínimo de ${cfg.minRentalDays} dia(s).`);
    if (days > cfg.maxRentalDays) throw ApiError.badRequest(`Máximo de ${cfg.maxRentalDays} dia(s).`);
    const conflict = await prisma.rentalBooking.findFirst({
      where: { configId, status: { in: ['CONFIRMED','ACTIVE','PENDING'] },
        AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }] },
    });
    if (conflict) throw ApiError.conflict('Veículo já reservado neste período.');
    const pricing = calcRentalPrice({ dailyRate: cfg.dailyRate, days, protectionPlan: cfg.protectionPlan });
    const status = cfg.instantBook ? 'CONFIRMED' : 'PENDING';
    const booking = await prisma.rentalBooking.create({
      data: { configId, listingId: cfg.listingId, hostId: cfg.hostId, renterId: req.user.id,
        startDate: start, endDate: end, status,
        renterPaymentStatus: 'PENDING', hostPayoutStatus: 'PENDING', ...pricing },
    });
    const msg = cfg.instantBook ? '🗝️ Reserva confirmada automaticamente!' : '📋 Solicitação enviada! Aguardando aprovação do anfitrião.';
    prisma.notification.create({ data: {
      userId: booking.hostId,
      type: 'LISTING_MESSAGE',
      title: '🗝️ Nova solicitação de reserva',
      body: `${booking.renter?.name||'Um locatário'} quer reservar seu veículo de ${new Date(booking.startDate).toLocaleDateString('pt-BR')} a ${new Date(booking.endDate).toLocaleDateString('pt-BR')}.`,
      data: { bookingId: booking.id, page: 'painel-anfitriao' }
    }}).catch(()=>{});
    R.created(res, booking, msg);
  } catch (e) { next(e); }
});

router.get('/bookings/mine', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { renterId: req.user.id, ...(status && { status }) };
    const [total, bookings] = await Promise.all([
      prisma.rentalBooking.count({ where }),
      prisma.rentalBooking.findMany({
        where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          config: { include: { listing: { select: { id: true, title: true, images: true, city: true, state: true } } } },
          host: { select: { id: true, name: true, avatar: true } },
        },
      }),
    ]);
    R.paginated(res, bookings, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (e) { next(e); }
});

router.get('/bookings/host', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { hostId: req.user.id, ...(status && { status }) };
    const [total, bookings] = await Promise.all([
      prisma.rentalBooking.count({ where }),
      prisma.rentalBooking.findMany({
        where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          config: { include: { listing: { select: { id: true, title: true, images: true } } } },
          renter: { select: { id: true, name: true, avatar: true, phone: true } },
        },
      }),
    ]);
    R.paginated(res, bookings, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (e) { next(e); }
});

router.get('/bookings/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await prisma.rentalBooking.findUnique({
      where: { id: req.params.id },
      include: {
        config: { include: { listing: { select: { id: true, title: true, images: true, city: true, state: true, description: true } } } },
        host:   { select: { id: true, name: true, avatar: true, phone: true } },
        renter: { select: { id: true, name: true, avatar: true, phone: true } },
      },
    });
    if (!booking) throw ApiError.notFound('Reserva');
    if (booking.renterId !== req.user.id && booking.hostId !== req.user.id) throw ApiError.forbidden();
    R.ok(res, booking);
  } catch (e) { next(e); }
});

router.patch('/bookings/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const b = await assertBookingParty(req.params.id, req.user.id);
    if (b.hostId !== req.user.id) throw ApiError.forbidden('Apenas o anfitrião pode confirmar.');
    if (b.status !== 'PENDING') throw ApiError.conflict(`Reserva não está pendente (status: ${b.status}).`);
    const updated = await prisma.rentalBooking.update({ where: { id: req.params.id }, data: { status: 'CONFIRMED' } });
    prisma.notification.create({ data: {
      userId: updated.renterId,
      type: 'SYSTEM',
      title: '✅ Reserva confirmada!',
      body: 'Sua reserva foi aprovada. Efetue o pagamento para garantir.',
      data: { bookingId: updated.id, page: 'minhas-reservas' }
    }}).catch(()=>{});
    R.ok(res, updated, '✅ Reserva confirmada!');
  } catch (e) { next(e); }
});

router.patch('/bookings/:id/decline', authenticate, async (req, res, next) => {
  try {
    const b = await assertBookingParty(req.params.id, req.user.id);
    if (b.hostId !== req.user.id) throw ApiError.forbidden('Apenas o anfitrião pode recusar.');
    if (b.status !== 'PENDING') throw ApiError.conflict(`Não está pendente (status: ${b.status}).`);
    const updated = await prisma.rentalBooking.update({
      where: { id: req.params.id },
      data: { status: 'DECLINED', cancelledAt: new Date(), cancelReason: req.body.reason || null },
    });
    prisma.notification.create({ data: {
      userId: updated.renterId,
      type: 'SYSTEM',
      title: '❌ Reserva recusada',
      body: 'O anfitrião não pôde aceitar sua solicitação. Tente outro veículo.',
      data: { bookingId: updated.id, page: 'minhas-reservas' }
    }}).catch(()=>{});
    R.ok(res, updated, 'Reserva recusada.');
  } catch (e) { next(e); }
});

router.patch('/bookings/:id/checkin', authenticate, async (req, res, next) => {
  try {
    const b = await assertBookingParty(req.params.id, req.user.id);
    if (b.hostId !== req.user.id) throw ApiError.forbidden('Apenas o anfitrião pode fazer check-in.');
    if (b.status !== 'CONFIRMED') throw ApiError.conflict(`Precisa estar CONFIRMED (atual: ${b.status}).`);
    const updated = await prisma.rentalBooking.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } });
    R.ok(res, updated, '🚗 Check-in realizado! Locação em andamento.');
  } catch (e) { next(e); }
});

router.patch('/bookings/:id/checkout', authenticate, async (req, res, next) => {
  try {
    const b = await assertBookingParty(req.params.id, req.user.id);
    if (b.hostId !== req.user.id) throw ApiError.forbidden('Apenas o anfitrião pode fazer check-out.');
    if (b.status !== 'ACTIVE') throw ApiError.conflict(`Precisa estar ACTIVE (atual: ${b.status}).`);
    const retentionDays = parseInt(process.env.WALLET_RETENTION_DAYS ?? 3);
    const releaseAt = new Date();
    releaseAt.setDate(releaseAt.getDate() + retentionDays);
    const updated = await prisma.rentalBooking.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', hostPayoutReleaseAt: releaseAt },
    });
    R.ok(res, updated, `✅ Check-out concluído! Pagamento liberado em ${retentionDays} dias.`);
  } catch (e) { next(e); }
});

router.patch('/bookings/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const b = await assertBookingParty(req.params.id, req.user.id);
    if (!['PENDING','CONFIRMED'].includes(b.status))
      throw ApiError.conflict(`Não é possível cancelar com status "${b.status}".`);
    const updated = await prisma.rentalBooking.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: req.body.reason || null },
    });
    R.ok(res, updated, 'Reserva cancelada.');
  } catch (e) { next(e); }
});

// ── PATCH /bookings/:id/cancel-paid — cancela reserva ACTIVE (já paga) ────
// Anfitrião: sempre reembolso integral.
// Locatário: reembolso integral se cancelar com >= RENTAL_CANCEL_FULL_REFUND_HOURS
// de antecedência do check-in; depois disso, sem reembolso automático —
// vai para DISPUTED e fica pra revisão manual do admin.
router.patch('/bookings/:id/cancel-paid', authenticate, async (req, res, next) => {
  try {
    const b = await assertBookingParty(req.params.id, req.user.id);
    if (b.status !== 'ACTIVE')
      throw ApiError.conflict(`Só é possível usar cancel-paid em reservas ACTIVE (atual: "${b.status}").`);

    const isHost = b.hostId === req.user.id;
    const cutoffHours = parseInt(process.env.RENTAL_CANCEL_FULL_REFUND_HOURS ?? 24);
    const hoursToStart = (new Date(b.startDate).getTime() - Date.now()) / 3_600_000;
    const eligibleForAutoRefund = isHost || hoursToStart >= cutoffHours;

    if (!eligibleForAutoRefund) {
      const updated = await prisma.rentalBooking.update({
        where: { id: b.id },
        data: {
          status: 'DISPUTED',
          cancelledAt: new Date(),
          cancelReason: req.body.reason || 'Cancelamento tardio pelo locatário (fora da janela de reembolso automático).',
        },
      });
      prisma.notification.create({ data: {
        userId: b.hostId,
        type: 'SYSTEM',
        title: '⚠️ Cancelamento tardio — revisão necessária',
        body: 'O locatário pediu cancelamento fora da janela de reembolso automático. Aguardando revisão do admin.',
        data: { bookingId: b.id, page: 'painel-anfitriao' },
      }}).catch(() => {});
      return R.ok(res, updated,
        `Cancelamento registrado como disputa — menos de ${cutoffHours}h para o check-in. Reembolso requer revisão manual.`);
    }

    const { refundRentalBooking } = await import('../services/payment.service.js');
    const { refunded, mocked } = await refundRentalBooking(b);

    const updated = await prisma.rentalBooking.update({
      where: { id: b.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: req.body.reason || (isHost ? 'Cancelado pelo anfitrião.' : 'Cancelado pelo locatário (dentro da janela de reembolso).'),
        renterPaymentStatus: refunded ? 'REFUNDED' : b.renterPaymentStatus,
      },
    });

    prisma.notification.create({ data: {
      userId: isHost ? b.renterId : b.hostId,
      type: 'SYSTEM',
      title: isHost ? '❌ Anfitrião cancelou a reserva' : '❌ Locatário cancelou a reserva',
      body: refunded
        ? `Reserva cancelada. Reembolso ${mocked ? 'simulado' : 'processado'} integralmente.`
        : 'Reserva cancelada.',
      data: { bookingId: b.id },
    }}).catch(() => {});

    R.ok(res, { booking: updated, refunded, mocked },
      refunded ? '✅ Reserva cancelada e reembolso processado.' : 'Reserva cancelada.');
  } catch (e) { next(e); }
});


// MP Webhook — pagamento aprovado → notifica anfitrião (PAYMENT_RECEIVED)
router.post('/bookings/mp-webhook', async (req, res, next) => {
  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return res.sendStatus(200);
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    if (!mpRes.ok) return res.sendStatus(200);
    const payment = await mpRes.json();
    if (payment.status !== 'approved') return res.sendStatus(200);
    const bookingId = payment.external_reference;
    if (!bookingId) return res.sendStatus(200);
    const booking = await prisma.rentalBooking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.sendStatus(200);
    await prisma.rentalBooking.update({
      where: { id: bookingId },
      data: { status: 'ACTIVE', renterPaymentStatus: 'COMPLETED', mpPaymentId: String(data.id) },
    });
    prisma.notification.create({ data: {
      userId: booking.hostId,
      type: 'PAYMENT_RECEIVED',
      title: '💰 Pagamento recebido!',
      body: 'O locatário efetuou o pagamento. A reserva está ativa.',
      data: { bookingId: booking.id, page: 'painel-anfitriao' },
    }}).catch(() => {});
    res.sendStatus(200);
  } catch (e) { next(e); }
});

// ── POST /bookings/:id/pay — cria preferência MP e retorna init_point ──────
router.post('/bookings/:id/pay', authenticate, async (req, res, next) => {
  try {
    const b = await assertBookingParty(req.params.id, req.user.id);
    if (b.renterId !== req.user.id) throw ApiError.forbidden('Apenas o locatário pode iniciar o pagamento.');
    if (b.status !== 'CONFIRMED') throw ApiError.conflict(`Reserva precisa estar CONFIRMED (atual: ${b.status}).`);
    if (b.renterPaymentStatus === 'COMPLETED') throw ApiError.conflict('Pagamento já realizado.');

    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const APP_URL = process.env.APP_URL || 'https://mobya.onrender.com';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cpiresci.github.io/mobya-master';

    if (!MP_ACCESS_TOKEN) throw ApiError.badRequest('Integração MP não configurada.');

    const import_crypto = (await import('crypto')).default;
    const idempotencyKey = `rental-pay-${b.id}`;

    const body = {
      items: [{
        id: b.id,
        title: `Aluguel de veículo — ${new Date(b.startDate).toLocaleDateString('pt-BR')} a ${new Date(b.endDate).toLocaleDateString('pt-BR')}`,
        quantity: 1,
        unit_price: parseFloat(b.renterTotalAmount),
        currency_id: 'BRL',
      }],
      payer: { email: req.user.email },
      external_reference: b.id,
      back_urls: {
        success: `${FRONTEND_URL}/rental-guest.html?payment=success`,
        pending: `${FRONTEND_URL}/rental-guest.html?payment=pending`,
        failure: `${FRONTEND_URL}/rental-guest.html?payment=failure`,
      },
      auto_return: 'approved',
      notification_url: `${APP_URL}/api/v1/rental/bookings/mp-webhook`,
      metadata: { booking_id: b.id, renter_id: b.renterId, mobya: true },
    };

    const mpRes = await fetch('https://api.mercadopago.com/v1/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!mpRes.ok) {
      const err = await mpRes.json();
      throw new Error(err.message || `MP API error ${mpRes.status}`);
    }
    const preference = await mpRes.json();

    await prisma.rentalBooking.update({
      where: { id: b.id },
      data: { mpPreferenceId: preference.id },
    });

    R.ok(res, {
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    }, 'Preferência de pagamento criada!');
  } catch (e) { next(e); }
});

// ── POST /bookings/:id/mock-pay — APENAS TESTE: simula webhook aprovado ────
// ⚠️  REMOVER ANTES DE IR PARA PRODUÇÃO
router.post('/bookings/:id/mock-pay', authenticate, async (req, res, next) => {
  try {
    if (!process.env.ALLOW_MOCK_PAY) {
      throw ApiError.forbidden('Endpoint de teste não disponível em produção.');
    }
    const b = await assertBookingParty(req.params.id, req.user.id);
    if (b.renterId !== req.user.id) throw ApiError.forbidden('Apenas o locatário pode usar mock-pay.');
    if (b.status !== 'CONFIRMED') throw ApiError.conflict(`Reserva precisa estar CONFIRMED (atual: ${b.status}).`);
    if (b.renterPaymentStatus === 'COMPLETED') throw ApiError.conflict('Pagamento já marcado como pago.');

    const fakeMpPaymentId = `MOCK-${Date.now()}`;
    const updated = await prisma.rentalBooking.update({
      where: { id: b.id },
      data: {
        status: 'ACTIVE',
        renterPaymentStatus: 'COMPLETED',
        mpPaymentId: fakeMpPaymentId,
        paidAt: new Date(),
      },
    });

    // Mesma notificação do webhook real
    prisma.notification.create({ data: {
      userId: updated.hostId,
      type: 'PAYMENT_RECEIVED',
      title: '💰 Pagamento recebido! (mock)',
      body: 'O locatário efetuou o pagamento (simulado). A reserva está ativa.',
      data: { bookingId: updated.id, page: 'painel-anfitriao' },
    }}).catch(() => {});

    R.ok(res, { booking: updated, mockPaymentId: fakeMpPaymentId }, '✅ Pagamento simulado com sucesso!');
  } catch (e) { next(e); }
});

export default router;
