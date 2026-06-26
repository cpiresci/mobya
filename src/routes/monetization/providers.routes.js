import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { ApiError, R } from '../../utils/ApiError.js';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth.js';
import { COMMISSION_RATES, canonicalVertical } from '../../services/monetization/commission.service.js';
import { findNearbyProviders } from '../../services/quote.service.js';

const router = Router();

router.get('/rates', (_req, res) => {
  R.ok(res, { verticals: [
    { vertical:'SERVICE',    rate:`${(COMMISSION_RATES.SERVICE    * 100).toFixed(0)}%`, desc:'Oficinas, auto centers, chaveiros, elétricos' },
    { vertical:'FLEET_RENTAL', rate:`${(COMMISSION_RATES.FLEET_RENTAL * 100).toFixed(0)}%`, desc:'Locadoras: Localiza, Unidas, Movida' },
    { vertical:'LOGISTICS',  rate:`${(COMMISSION_RATES.LOGISTICS  * 100).toFixed(0)}%`, desc:'Fretes, reboques, peças' },
    { vertical:'INSURANCE',  rate:'10%–22%',                                            desc:'Seguros (auto, vida) — % do prêmio, varia por produto' },
    { vertical:'FINANCING',  rate:`${(COMMISSION_RATES.FINANCING  * 100).toFixed(0)}%`, desc:'Financiamento CDC / leasing — correspondente bancário' },
    { vertical:'CONSORTIUM', rate:`${(COMMISSION_RATES.CONSORTIUM * 100).toFixed(0)}%`, desc:'Consórcio — % da carta de crédito' },
    { vertical:'PARTS',      rate:`${(COMMISSION_RATES.PARTS      * 100).toFixed(0)}%`, desc:'Peças OEM/OES, acessórios' },
  ]});
});

router.get('/categories', (_req, res) => {
  R.ok(res, { SERVICE:['DEALERSHIP','AUTO_CENTER','MECHANIC_SHOP','ELECTRICIAN','TIRE_SHOP','LOCKSMITH'], FLEET_RENTAL:['DAILY','MONTHLY','FLEET'], LOGISTICS:['FREIGHT','TOW','PARTS_DELIVERY'], INSURANCE:['AUTO_FULL','AUTO_POPULAR','LIFE','CONSORTIUM_AUTO'] });
});

router.get('/providers', optionalAuth, async (req, res, next) => {
  try {
    const { vertical, city, state, page=1, limit=20 } = req.query;
    const where = { status:'ACTIVE', ...(vertical&&{vertical:canonicalVertical(vertical)}), ...(city&&{city:{contains:city}}), ...(state&&{state:{equals:state}}) };
    const [total, providers] = await Promise.all([
      prisma.monetizationProvider.count({where}),
      prisma.monetizationProvider.findMany({where,skip:(parseInt(page)-1)*parseInt(limit),take:parseInt(limit),orderBy:{ratingAvg:'desc'}}),
    ]);
    R.ok(res, { providers, pagination:{page:parseInt(page),limit:parseInt(limit),total} });
  } catch(e) { next(e); }
});

// ── EXPLORE NEARBY (público) ──────────────────────────────────────────────
// Mapa público "perto de você" — sem autenticação, qualquer visitante
// pode descobrir parceiros (oficinas, guinchos, locadoras) próximos.
// Reaproveita a mesma lógica haversine usada no dispatch de emergências.
router.get('/providers/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radiusKm, vertical } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      throw ApiError.badRequest('lat e lng são obrigatórios e devem ser numéricos.');
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      throw ApiError.badRequest('lat/lng fora do intervalo válido.');
    }
    const radius = Math.min(parseFloat(radiusKm) || 30, 200); // teto de 200km pra evitar varredura absurda
    const providers = await findNearbyProviders({
      lat: latNum,
      lng: lngNum,
      radiusKm: radius,
      vertical: vertical ? canonicalVertical(vertical) : undefined,
    });
    // Payload enxuto — só o necessário pra plotar o marcador no mapa.
    const slim = providers.map((p) => ({
      id: p.id,
      name: p.name,
      vertical: p.vertical,
      category: p.category,
      city: p.city,
      state: p.state,
      latitude: p.latitude,
      longitude: p.longitude,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      emergency24h: p.emergency24h,
      distanceKm: +p.distanceKm.toFixed(2),
    }));
    R.ok(res, { providers: slim, count: slim.length });
  } catch (e) { next(e); }
});

router.get('/providers/mine', authenticate, async (req, res, next) => {
  try {
    const providers = await prisma.monetizationProvider.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    R.ok(res, { providers });
  } catch(e) { next(e); }
});

router.post('/providers', authenticate, async (req, res, next) => {
  try {
    const { name, vertical, city, state, category, phone, email, description, emergency24h, cnpj, latitude, longitude } = req.body;
    if (!name||!vertical||!city||!state) throw ApiError.badRequest('name, vertical, city e state são obrigatórios.');
    if (latitude == null || latitude === '' || longitude == null || longitude === '') throw ApiError.badRequest('latitude e longitude são obrigatórias — sem elas o parceiro nunca recebe emergências por proximidade.');
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw ApiError.badRequest('latitude/longitude inválidas.');
    const canonVertical = canonicalVertical(vertical);
    const p = await prisma.monetizationProvider.create({ data:{ ownerId:req.user.id, name, vertical:canonVertical, city, state, category:category||null, phone:phone||null, email:email||null, description:description||null, emergency24h:!!emergency24h, cnpj:cnpj||null, latitude:lat, longitude:lng, commissionRate:COMMISSION_RATES[canonVertical]||0.10, specialties:[], status:'PENDING' } });
    R.created(res, p, 'Parceiro cadastrado! Aguardando aprovação em até 48h.');
  } catch(e) { next(e); }
});

router.patch('/providers/:id/location', authenticate, async (req, res, next) => {
  try {
    const provider = await prisma.monetizationProvider.findUnique({ where: { id: req.params.id } });
    if (!provider) throw ApiError.notFound('Parceiro');
    if (provider.ownerId !== req.user.id && !['ADMIN','SUPER_ADMIN'].includes(req.user.role)) throw ApiError.forbidden();
    const { latitude, longitude } = req.body;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw ApiError.badRequest('latitude e longitude são obrigatórias e devem ser numéricas.');
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw ApiError.badRequest('latitude/longitude fora do intervalo válido.');
    const updated = await prisma.monetizationProvider.update({ where: { id: req.params.id }, data: { latitude: lat, longitude: lng } });
    R.ok(res, updated, '📍 Localização atualizada! Você já pode receber ofertas por proximidade.');
  } catch (e) { next(e); }
});

router.post('/providers/:id/rating', authenticate, async (req, res, next) => {
  try {
    const { rating, quoteId, sessionId } = req.body;
    const score = parseFloat(rating);
    if (!score || score < 1 || score > 5) throw ApiError.badRequest('rating deve ser entre 1 e 5.');
    if (!sessionId && !quoteId) {
      // SEGURANÇA: sem sessionId/quoteId não há como provar que o usuário
      // de fato contratou este prestador — sem essa exigência, qualquer
      // pessoa autenticada poderia avaliar qualquer parceiro (brigading /
      // autopromoção com contas falsas).
      throw ApiError.badRequest('Informe sessionId ou quoteId do atendimento concluído para avaliar.');
    }

    const provider = await prisma.monetizationProvider.findFirst({
      where: { OR: [{ id: req.params.id }, { ownerId: req.params.id }] },
    });
    if (!provider) throw ApiError.notFound('Parceiro');
    if (provider.status !== 'ACTIVE') throw ApiError.conflict('Parceiro inativo.');

    let session = null;
    let quote = null;
    if (sessionId) {
      session = await prisma.trackingSession.findFirst({
        where: { id: sessionId, userId: req.user.id },
      });
      if (!session) throw ApiError.forbidden('Sessão de atendimento inválida.');
      if (session.status !== 'CONCLUIDO') throw ApiError.conflict('Você só pode avaliar um serviço concluído.');
      if (session.ratedAt) throw ApiError.conflict('Você já avaliou este atendimento.');
    } else if (quoteId) {
      quote = await prisma.monetizationQuote.findFirst({
        where: { id: quoteId, userId: req.user.id, providerId: provider.id, status: 'COMPLETED' },
      });
      if (!quote) throw ApiError.forbidden('Você só pode avaliar um serviço concluído.');
      if (quote.ratedAt) throw ApiError.conflict('Você já avaliou este atendimento.');
    }

    const newCount = provider.ratingCount + 1;
    const newAvg   = +((provider.ratingAvg * provider.ratingCount + score) / newCount).toFixed(2);
    const updated = await prisma.monetizationProvider.update({
      where: { id: provider.id },
      data: { ratingAvg: newAvg, ratingCount: newCount },
    });

    if (session) {
      await prisma.trackingSession.update({ where: { id: session.id }, data: { ratedAt: new Date() } });
    } else if (quote) {
      await prisma.monetizationQuote.update({ where: { id: quote.id }, data: { ratedAt: new Date() } });
    }

    R.ok(res, { ratingAvg: updated.ratingAvg, ratingCount: updated.ratingCount }, 'Avaliação registrada!');
  } catch(e) { next(e); }
});


// ── CLAIM (seed-provider) ─────────────────────────────────────
// SEGURANÇA: este endpoint deixava qualquer usuário autenticado assumir
// a posse de qualquer perfil de prestador sem dono (inclusive perfis com
// reputação/avaliações vindas de dados de seed), sem nenhuma verificação
// de identidade. Restrito a admin: o admin atribui o perfil ao usuário
// correto após confirmar a identidade dele fora do app (telefone, CNPJ etc).
router.patch('/providers/:id/claim', authenticate, authorize('ADMIN','SUPER_ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.monetizationProvider.findUnique({ where: { id: req.params.id } });
    if (!provider) throw ApiError.notFound('Parceiro nao encontrado.');
    if (provider.ownerId) throw ApiError.conflict('Este parceiro ja tem um dono.');
    const { ownerId } = req.body;
    if (!ownerId) throw ApiError.badRequest('ownerId obrigatório.');
    const updated = await prisma.monetizationProvider.update({
      where: { id: req.params.id },
      data: { ownerId, status: 'ACTIVE' },
    });
    R.ok(res, updated, 'Claim realizado!');
  } catch(e) { next(e); }
});

export default router;
