import { Router } from 'express';
import { prisma } from '../config/database.js';
import { R, ApiError } from '../utils/ApiError.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { dispatchCascade, acceptOffer, rejectOffer, getCascadeStatus, getSessionIdForEmergency, getMyPendingOffer } from '../services/dispatch.service.js';
import { haversineKm, boundingBoxDelta } from '../utils/geo.js';

const router = Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type, description, latitude, longitude, address, vertical } = req.body;
    if (!type) throw ApiError.badRequest('Tipo de emergência obrigatório.');
    // Fase 5: emergência criada com status PENDING_PAYMENT — dispatch só
    // dispara após o PIX do cliente ser confirmado pelo webhook do MP.
    // Ver: emergency-payment.routes.js → POST /:id/initiate-payment
    const emergency = await prisma.emergency.create({
      data: {
        userId:      req.user.id,
        type,
        description: description || null,
        latitude:    latitude    || null,
        longitude:   longitude   || null,
        address:     address     || null,
        status:      'PENDING',
        customerPaymentStatus: 'UNPAID',
      },
    });

    R.created(res, { ...emergency, nextStep: 'initiate-payment' },
      '🚨 Emergência registrada! Gere o PIX para iniciar a busca do prestador.');
  } catch (e) { next(e); }
});

function mapTypeToVertical(type) {
  const MAP = { TOW: 'LOGISTICS', LOCKSMITH: 'SERVICE', FLAT_TIRE: 'SERVICE', BATTERY: 'SERVICE', FUEL: 'SERVICE', ACCIDENT: 'SERVICE', OVERHEAT: 'SERVICE', FREIGHT: 'LOGISTICS', MECHANIC: 'SERVICE', OTHER: 'SERVICE' };
  return MAP[type] || 'SERVICE';
}

router.post('/:id/accept-offer', authenticate, authorize('MECHANIC','SELLER'), async (req, res, next) => {
  try {
    const provider = await prisma.monetizationProvider.findFirst({ where: { ownerId: req.user.id } });
    if (!provider) throw ApiError.forbidden('Você não tem um perfil de prestador ativo.');

    const result = await acceptOffer({ emergencyId: req.params.id, providerId: provider.id });
    if (!result.ok) throw ApiError.badRequest(`Oferta indisponível: ${result.reason}`);
    R.ok(res, { ...result.emergency, sessionId: result.sessionId }, 'Oferta aceita! Use o GPS Tracking para iniciar o atendimento.');
  } catch (e) { next(e); }
});

router.post('/:id/reject-offer', authenticate, authorize('MECHANIC','SELLER'), async (req, res, next) => {
  try {
    const provider = await prisma.monetizationProvider.findFirst({ where: { ownerId: req.user.id } });
    if (!provider) throw ApiError.forbidden('Você não tem um perfil de prestador ativo.');

    const result = await rejectOffer({ emergencyId: req.params.id, providerId: provider.id });
    R.ok(res, result, 'Oferta rejeitada.');
  } catch (e) { next(e); }
});

router.get('/:id/dispatch-status', authenticate, async (req, res, next) => {
  try {
    const em = await prisma.emergency.findUnique({ where: { id: req.params.id } });
    if (!em) throw ApiError.notFound('Emergência');
    // SEGURANÇA: sem isso, qualquer usuário autenticado que soubesse/
    // adivinhasse um id de emergência conseguia ver o estado interno da
    // cascata de despacho (prestadores notificados, timers, fila de
    // oferta) de uma emergência de outra pessoa.
    if (em.userId !== req.user.id && !['ADMIN','SUPER_ADMIN'].includes(req.user.role)) throw ApiError.forbidden();
    const state = await getCascadeStatus(req.params.id);
    if (!state) throw ApiError.notFound('Cascata não encontrada (expirada ou não iniciada).');
    R.ok(res, state);
  } catch (e) { next(e); }
});

router.get('/:id/tracking-session', authenticate, async (req, res, next) => {
  try {
    const em = await prisma.emergency.findUnique({ where: { id: req.params.id } });
    if (!em) throw ApiError.notFound('Emergência');
    if (em.userId !== req.user.id && !['ADMIN','SUPER_ADMIN'].includes(req.user.role)) throw ApiError.forbidden();

    const sessionId = await getSessionIdForEmergency(req.params.id);
    if (!sessionId) throw ApiError.notFound('Sessão de rastreamento ainda não criada — aguarde o prestador aceitar.');
    R.ok(res, { sessionId });
  } catch (e) { next(e); }
});

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const { page=1, limit=10 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const [total, emergencies] = await Promise.all([
      prisma.emergency.count({ where:{ userId:req.user.id } }),
      prisma.emergency.findMany({ where:{ userId:req.user.id }, skip, take:parseInt(limit), orderBy:{ createdAt:'desc' } }),
    ]);
    R.paginated(res, emergencies, { page:parseInt(page), limit:parseInt(limit), total });
  } catch (e) { next(e); }
});

// O dono da emergência só pode cancelar e editar a própria descrição —
// status final, custo, dados do prestador e timestamps de dispatch são
// o resultado do fluxo real (dispatch.service.js / GPS tracking / admin),
// não algo que o próprio cliente deveria conseguir setar arbitrariamente
// (ex.: marcar a própria emergência como COMPLETED com finalCost qualquer,
// sem nenhum prestador ter de fato atendido).
const CUSTOMER_ALLOWED = ['description'];
const CUSTOMER_ALLOWED_STATUS = ['CANCELLED'];
const ADMIN_ALLOWED = ['status','description','providerName','estimatedCost','finalCost','dispatchedAt','completedAt'];

router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const em = await prisma.emergency.findUnique({ where:{ id:req.params.id } });
    if (!em) throw ApiError.notFound('Emergência');
    const isAdmin = ['ADMIN','SUPER_ADMIN'].includes(req.user.role);
    const isOwner = em.userId === req.user.id;
    if (!isOwner && !isAdmin) throw ApiError.forbidden();

    const data = { updatedAt: new Date() };
    if (isAdmin) {
      for (const k of ADMIN_ALLOWED) if (k in req.body) data[k] = req.body[k];
    } else {
      for (const k of CUSTOMER_ALLOWED) if (k in req.body) data[k] = req.body[k];
      if ('status' in req.body) {
        if (!CUSTOMER_ALLOWED_STATUS.includes(req.body.status)) {
          throw ApiError.forbidden('Cliente só pode cancelar a própria emergência.');
        }
        data.status = req.body.status;
      }
    }
    const updated = await prisma.emergency.update({ where:{ id:req.params.id }, data });
    R.ok(res, updated);
  } catch (e) { next(e); }
});

router.get('/active', authenticate, authorize('ADMIN','SUPER_ADMIN'), async (_req, res, next) => {
  try {
    const list = await prisma.emergency.findMany({
      where:{ status:{ in:['PENDING','DISPATCHED','IN_PROGRESS'] } },
      orderBy:{ createdAt:'asc' },
      include:{ user:{ select:{ name:true, phone:true } } },
    });
    R.ok(res, list);
  } catch (e) { next(e); }
});

// ── Fallback REST pra prestador: usado por polling no painel quando o
// Socket.io não entregou a oferta em tempo real (app fechado, reconexão,
// processo do Render dormindo etc). Lê o estado da cascata direto do MySQL. ──
router.get('/my-offers', authenticate, authorize('MECHANIC','SELLER'), async (req, res, next) => {
  try {
    const provider = await prisma.monetizationProvider.findFirst({ where: { ownerId: req.user.id, status: 'ACTIVE' } });
    if (!provider) return R.ok(res, null);
    const offer = await getMyPendingOffer(provider.id);
    R.ok(res, offer);
  } catch (e) { next(e); }
});

router.get('/nearby', authenticate, async (req, res, next) => {
  try {
    const { latitude, longitude, radiusKm = 50, vertical } = req.query;
    if (!latitude || !longitude) throw ApiError.badRequest('latitude e longitude são obrigatórios.');

    const lat    = parseFloat(latitude);
    const lng    = parseFloat(longitude);
    const radius = parseFloat(radiusKm);

    const { latDelta, lngDelta } = boundingBoxDelta(lat, radius);

    const where = {
      status: 'ACTIVE',
      latitude:  { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      ...(vertical && { vertical }),
    };

    const candidates = await prisma.monetizationProvider.findMany({
      where,
      orderBy: { ratingAvg: 'desc' },
      take: 50,
    });

    const results = candidates
      .map((p) => ({ ...p, distanceKm: haversineKm(lat, lng, p.latitude, p.longitude) }))
      .filter((p) => p.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 20);

    // Retorna array direto: frontend (Ultra Map e monetization) faz data.length e data.map
    R.ok(res, results);
  } catch (e) { next(e); }
});


// Prestador atualiza sua localização durante atendimento
router.patch('/:id/provider-location', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat e lng são obrigatórios' });
    }

    const latitude  = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'lat/lng devem ser números válidos' });
    }

    // Verifica que a emergência existe e está em atendimento
    const emergency = await prisma.emergency.findFirst({
      where: {
        id,
        status: { in: ['DISPATCHED', 'IN_PROGRESS'] }
      }
    });

    if (!emergency) {
      return res.status(404).json({ error: 'Emergência não encontrada ou não autorizada' });
    }

    // O vínculo prestador↔emergência vive no dispatchState (acceptedBy = MonetizationProvider.id),
    // não há FK providerId no model Emergency. Resolve via provider.ownerId === req.user.id.
    const acceptedProviderId = emergency.dispatchState?.acceptedBy;
    if (!acceptedProviderId) {
      return res.status(404).json({ error: 'Emergência não encontrada ou não autorizada' });
    }

    const provider = await prisma.monetizationProvider.findFirst({
      where: { id: acceptedProviderId, ownerId: req.user.id }
    });

    if (!provider) {
      return res.status(404).json({ error: 'Emergência não encontrada ou não autorizada' });
    }

    // Atualiza lat/lng do prestador na emergência
    const updated = await prisma.emergency.update({
      where: { id },
      data: {
        providerLatitude:  latitude,
        providerLongitude: longitude,
        updatedAt: new Date()
      },
      select: {
        id: true,
        providerLatitude:  true,
        providerLongitude: true,
        updatedAt: true
      }
    });

    return res.json({ ok: true, data: updated });
  } catch (e) { next(e); }
});

export default router;
