import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ApiError, R } from '../utils/ApiError.js';
import { createTrackingSession, getTrackingSession } from '../socket/tracking.js';
import { haversineKm } from '../services/routing.service.js';
import { prisma } from '../config/database.js';
import { isOwnerOrAdmin } from '../services/monetization/provider.service.js';

const router = Router();

const CHECKIN_RADIUS_METERS = 100;

// Cria sessão de tracking (prestador chama ao aceitar quote)
router.post('/sessions', authenticate, async (req, res, next) => {
  try {
    const { quoteId, userId, vertical, address, originLat, originLng, destLat, destLng } = req.body;
    if (!userId) throw ApiError.badRequest('userId obrigatório.');
    if (!quoteId) throw ApiError.badRequest('quoteId obrigatório — sessão deve estar vinculada a uma cotação aceita.');

    // SEGURANÇA: sem isso, qualquer usuário autenticado podia criar uma
    // sessão de tracking se autodeclarando "prestador" e apontando QUALQUER
    // outro usuário como "cliente" (userId vindo direto do body, sem
    // nenhuma verificação de vínculo real entre as partes).
    const quote = await prisma.monetizationQuote.findUnique({ where: { id: quoteId } });
    if (!quote) throw ApiError.notFound('Quote');
    if (quote.userId !== userId) throw ApiError.badRequest('userId não corresponde ao cliente da cotação.');
    const allowed = await isOwnerOrAdmin(req.user, quote.providerId);
    if (!allowed) throw ApiError.forbidden('Apenas o prestador responsável por esta cotação pode iniciar o rastreamento.');

    const session = await createTrackingSession({
      userId,
      providerId: req.user.id,
      quoteId,
      vertical,
      address,
      originLat, originLng, destLat, destLng,
    });

    R.created(res, session, 'Sessão de rastreamento criada.');
  } catch (e) { next(e); }
});

// Consulta sessão (ambos podem buscar pelo sessionId) — também serve de fallback REST se WS cair
router.get('/sessions/:id', authenticate, async (req, res, next) => {
  try {
    const session = await getTrackingSession(req.params.id);
    if (!session) throw ApiError.notFound('Sessão');
    const isParticipant = session.userId === req.user.id || session.providerId === req.user.id;
    if (!isParticipant) throw ApiError.forbidden();
    R.ok(res, session);
  } catch (e) { next(e); }
});

// Histórico completo de pings — replay para auditoria/disputa
router.get('/sessions/:id/history', authenticate, async (req, res, next) => {
  try {
    const session = await getTrackingSession(req.params.id);
    if (!session) throw ApiError.notFound('Sessão');
    const isParticipant = session.userId === req.user.id || session.providerId === req.user.id;
    if (!isParticipant) throw ApiError.forbidden();

    const pings = await prisma.locationPing.findMany({
      where: { sessionId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    R.ok(res, { sessionId: req.params.id, pings });
  } catch (e) { next(e); }
});

// Check-in geofenced com foto — exigido antes de permitir status CHEGOU
router.post('/sessions/:id/checkin', authenticate, async (req, res, next) => {
  try {
    const { lat, lng, photoUrl } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw ApiError.badRequest('lat/lng obrigatórios.');
    }

    const session = await getTrackingSession(req.params.id);
    if (!session) throw ApiError.notFound('Sessão');
    if (session.providerId !== req.user.id) throw ApiError.forbidden('Apenas o prestador pode fazer check-in.');
    if (session.destLat == null || session.destLng == null) {
      throw ApiError.badRequest('Sessão sem destino definido — não é possível validar check-in.');
    }

    const distanceKm = haversineKm(lat, lng, session.destLat, session.destLng);
    const distanceMeters = distanceKm * 1000;
    const validated = distanceMeters <= CHECKIN_RADIUS_METERS;

    const proof = await prisma.serviceProof.upsert({
      where: { sessionId: req.params.id },
      create: {
        sessionId: req.params.id,
        photoUrl: photoUrl || null,
        checkedInLat: lat,
        checkedInLng: lng,
        distanceFromTarget: distanceMeters,
        validated,
        validatedAt: validated ? new Date() : null,
      },
      update: {
        photoUrl: photoUrl || null,
        checkedInLat: lat,
        checkedInLng: lng,
        distanceFromTarget: distanceMeters,
        validated,
        validatedAt: validated ? new Date() : null,
      },
    });

    if (!validated) {
      return R.ok(res, { proof, validated: false }, `Check-in fora do raio permitido (${Math.round(distanceMeters)}m, máx ${CHECKIN_RADIUS_METERS}m).`);
    }

    R.ok(res, { proof, validated: true }, 'Check-in validado.');
  } catch (e) { next(e); }
});

export default router;
