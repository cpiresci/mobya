import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { ApiError, R } from '../../utils/ApiError.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { COMMISSION_RATES, canonicalVertical } from '../../services/monetization/commission.service.js';
import { isOwnerOrAdmin } from '../../services/monetization/provider.service.js';

const router = Router();

const EMERGENCY_ONLY_VERTICALS = ['LOGISTICS', 'SERVICE'];

router.post('/quotes', authenticate, async (req, res, next) => {
  try {
    const { providerId, vertical, description, estimatedAmount, scheduledAt, insuranceProduct } = req.body;
    if (!vertical || !description) throw ApiError.badRequest('vertical e description são obrigatórios.');
    const canon = canonicalVertical(vertical);
    if (EMERGENCY_ONLY_VERTICALS.includes(canon) && scheduledAt) {
      throw ApiError.badRequest(
        `Serviços da vertical "${canon}" são despachados via fluxo de emergência ` +
        `(POST /emergency) e não aceitam agendamento por cotação. ` +
        `Remova scheduledAt ou use o endpoint de emergência.`
      );
    }
    // Validação de estimatedAmount: deve ser positivo e finito (evita Float negativo/Infinity no MySQL)
    let parsedAmount = null;
    if (estimatedAmount !== undefined && estimatedAmount !== null && estimatedAmount !== '') {
      parsedAmount = parseFloat(estimatedAmount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw ApiError.badRequest('estimatedAmount deve ser um valor positivo.');
      }
    }

    const q = await prisma.monetizationQuote.create({
      data: {
        userId:              req.user.id,
        providerId:          providerId || null,
        vertical:            canon,
        description,
        estimatedAmount:     parsedAmount,
        estimatedCommission: parsedAmount
          ? parseFloat((parsedAmount * (COMMISSION_RATES[canon] || 0.10)).toFixed(2))
          : null,
        insuranceProduct:    insuranceProduct || null,
        scheduledAt:         scheduledAt ? new Date(scheduledAt) : null,
        status:              'OPEN',
      },
    });
    R.created(res, q, 'Cotação enviada!');
  } catch(e) { next(e); }
});

router.get('/quotes/mine', authenticate, async (req, res, next) => {
  try {
    const { page=1, limit=20 } = req.query;
    const where = { userId: req.user.id };
    const [total, quotes] = await Promise.all([
      prisma.monetizationQuote.count({ where }),
      prisma.monetizationQuote.findMany({
        where,
        skip: (parseInt(page)-1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    R.paginated(res, quotes, { page: parseInt(page), limit: parseInt(limit), total });
  } catch(e) { next(e); }
});

router.get('/quotes/provider', authenticate, async (req, res, next) => {
  try {
    const { status, page=1, limit=20 } = req.query;
    const providers = await prisma.monetizationProvider.findMany({
      where:  { ownerId: req.user.id },
      select: { id: true },
    });
    const providerIds = providers.map(p => p.id);
    if (!providerIds.length) {
      return R.paginated(res, [], { page: parseInt(page), limit: parseInt(limit), total: 0 });
    }
    const where = { providerId: { in: providerIds }, ...(status && { status }) };
    const [total, quotes] = await Promise.all([
      prisma.monetizationQuote.count({ where }),
      prisma.monetizationQuote.findMany({
        where,
        skip:    (parseInt(page)-1) * parseInt(limit),
        take:    parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const providerMap = Object.fromEntries(
      (await prisma.monetizationProvider.findMany({
        where:  { id: { in: providerIds } },
        select: { id:true, name:true, vertical:true, category:true, commissionRate:true },
      })).map(p => [p.id, p])
    );
    const enriched = quotes.map(q => ({
      ...q,
      providerName:     q.providerId ? (providerMap[q.providerId]?.name     || '—') : '—',
      providerVertical: q.providerId ? (providerMap[q.providerId]?.vertical || null) : null,
      providerCategory: q.providerId ? (providerMap[q.providerId]?.category || null) : null,
    }));
    R.paginated(res, enriched, { page: parseInt(page), limit: parseInt(limit), total });
  } catch(e) { next(e); }
});

router.patch('/quotes/:id/accept', authenticate, async (req, res, next) => {
  try {
    const quote = await prisma.monetizationQuote.findUnique({ where: { id: req.params.id } });
    if (!quote) throw ApiError.notFound('Cotação');
    if (quote.status !== 'OPEN') throw ApiError.conflict('Cotação não está mais aberta.');
    const allowed = await isOwnerOrAdmin(req.user, quote.providerId);
    if (!allowed) throw ApiError.forbidden('Apenas o parceiro responsável pode aceitar esta cotação.');
    const updated = await prisma.monetizationQuote.update({
      where: { id: req.params.id },
      data:  { status: 'ACCEPTED' },
    });
    R.ok(res, updated, 'Cotação aceita.');
  } catch(e) { next(e); }
});

router.patch('/quotes/:id/complete', authenticate, async (req, res, next) => {
  try {
    const quote = await prisma.monetizationQuote.findUnique({ where: { id: req.params.id } });
    if (!quote) throw ApiError.notFound('Cotação');
    if (!['ACCEPTED','OPEN'].includes(quote.status)) throw ApiError.conflict('Cotação não pode ser concluída neste estado.');
    const isProviderOrAdmin = await isOwnerOrAdmin(req.user, quote.providerId);
    const isCustomer = quote.userId === req.user.id;
    if (!isProviderOrAdmin && !isCustomer) throw ApiError.forbidden();

    // SEGURANÇA: só o prestador (ou admin) pode declarar o valor final do
    // serviço — é esse valor que determina a comissão que ELE vai pagar.
    // Se o cliente concluir a própria cotação, usamos o valor estimado
    // original, sem permitir que ele informe finalAmount livremente
    // (evita subfaturamento da comissão ou inflar a cobrança do prestador).
    const { finalAmount } = req.body || {};
    const amount = isProviderOrAdmin && finalAmount
      ? parseFloat(finalAmount)
      : quote.estimatedAmount;
    const rate = COMMISSION_RATES[canonicalVertical(quote.vertical)] || 0.10;
    const commissionAmount = amount ? +(amount * rate).toFixed(2) : (quote.estimatedCommission || 0);
    const [updated] = await prisma.$transaction([
      prisma.monetizationQuote.update({
        where: { id: req.params.id },
        data: {
          status: 'COMPLETED',
          estimatedAmount:     amount ?? quote.estimatedAmount,
          estimatedCommission: commissionAmount,
        },
      }),
      prisma.monetizationCommission.create({
        data: {
          quoteId:          quote.id,
          providerId:       quote.providerId,
          vertical:         quote.vertical,
          commissionAmount: commissionAmount || 0,
          status:           'CHARGEABLE',
        },
      }),
    ]);
    R.ok(res, updated, 'Cotação concluída! Comissão gerada.');
  } catch(e) { next(e); }
});

router.patch('/quotes/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const quote = await prisma.monetizationQuote.findUnique({ where: { id: req.params.id } });
    if (!quote) throw ApiError.notFound('Cotação');
    if (!['OPEN','ACCEPTED'].includes(quote.status)) throw ApiError.conflict('Cotação não pode ser cancelada neste estado.');
    let allowed = await isOwnerOrAdmin(req.user, quote.providerId);
    if (!allowed && quote.userId === req.user.id) allowed = true;
    if (!allowed) throw ApiError.forbidden('Sem permissão para cancelar esta cotação.');
    const updated = await prisma.monetizationQuote.update({
      where: { id: req.params.id },
      data:  { status: 'CANCELLED' },
    });
    R.ok(res, updated, 'Cotação cancelada.');
  } catch(e) { next(e); }
});

export default router;
