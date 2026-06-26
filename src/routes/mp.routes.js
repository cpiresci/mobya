import { Router } from 'express';
import { prisma } from '../config/database.js';
import { ApiError, R } from '../utils/ApiError.js';
import { authenticate, authorize } from '../middleware/auth.js';
import crypto from 'crypto';
import { verifyMpWebhookSignature } from '../services/monetization/mp-signature.service.js';
import { handleEmergencyPaymentApproved } from './emergency-payment.routes.js';
import { mpFetch } from '../services/mp.service.js';

const router = Router();

const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const APP_URL = process.env.APP_URL || 'https://mobya.onrender.com';



router.post('/commissions/:id/charge', authenticate, async (req, res, next) => {
  try {
    if (!MP_ACCESS_TOKEN) throw ApiError.badRequest('Integração MP não configurada.');
    const commission = await prisma.monetizationCommission.findUnique({ where: { id: req.params.id } });
    if (!commission) throw ApiError.notFound('Comissão');
    if (!['CHARGEABLE','PENDING'].includes(commission.status)) throw ApiError.conflict('Comissão não disponível para cobrança.');
    if (commission.mpPaymentId) throw ApiError.conflict('Cobrança já gerada. Use GET /payment para o status.');
    const isAdmin = ['ADMIN','SUPER_ADMIN'].includes(req.user.role);
    if (!isAdmin && commission.providerId) {
      const provider = await prisma.monetizationProvider.findUnique({ where: { id: commission.providerId } });
      if (!provider || provider.ownerId !== req.user.id) throw ApiError.forbidden('Sem permissão.');
    } else if (!isAdmin && !commission.providerId) {
      // SEGURANÇA: comissão sem providerId (ex.: gerada por fluxo administrativo)
      // não pode ser cobrada por um usuário comum só porque não há dono a comparar.
      throw ApiError.forbidden('Sem permissão.');
    }
    const provider = commission.providerId ? await prisma.monetizationProvider.findUnique({ where: { id: commission.providerId } }) : null;
    const payerEmail = provider?.email || req.user.email || 'pagador@mobya.com.br';
    const description = `Comissão MOBYA — ${commission.vertical} — ID ${commission.id.slice(0,8)}`;
    const payment = await mpFetch('/v1/payments', {
      method: 'POST',
      idempotencyKey: `mobya-comm-${commission.id}`,
      body: {
        transaction_amount: commission.commissionAmount,
        description,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          ...(provider?.cnpj ? { identification: { type: provider.cnpj.replace(/\D/g,'').length <= 11 ? 'CPF' : 'CNPJ', number: provider.cnpj.replace(/\D/g,'') } } : {}),
        },
        notification_url: `${APP_URL}/api/v1/monetization/webhook/mp`,
        metadata: { commission_id: commission.id, provider_id: commission.providerId || '', mobya: true },
      },
    });
    await prisma.monetizationCommission.update({
      where: { id: commission.id },
      data: { mpPaymentId: String(payment.id), mpStatus: payment.status, payerEmail, status: 'PENDING' },
    });
    const pix = payment.point_of_interaction?.transaction_data;
    R.ok(res, { paymentId: payment.id, status: payment.status, amount: commission.commissionAmount, pix: { qrCode: pix?.qr_code || null, qrCodeBase64: pix?.qr_code_base64 || null } }, 'PIX gerado!');
  } catch(e) { next(e); }
});

router.get('/commissions/:id/payment', authenticate, async (req, res, next) => {
  try {
    const commission = await prisma.monetizationCommission.findUnique({ where: { id: req.params.id } });
    if (!commission) throw ApiError.notFound('Comissão');
    if (!commission.mpPaymentId) throw ApiError.badRequest('Nenhum pagamento gerado ainda.');
    const isAdmin = ['ADMIN','SUPER_ADMIN'].includes(req.user.role);
    if (!isAdmin && commission.providerId) {
      const provider = await prisma.monetizationProvider.findUnique({ where: { id: commission.providerId } });
      if (!provider || provider.ownerId !== req.user.id) throw ApiError.forbidden('Sem permissão.');
    } else if (!isAdmin && !commission.providerId) {
      throw ApiError.forbidden('Sem permissão.');
    }
    const payment = await mpFetch(`/v1/payments/${commission.mpPaymentId}`);
    if (payment.status !== commission.mpStatus) {
      const newStatus = payment.status === 'approved' ? 'PAID' : payment.status === 'cancelled' ? 'CHARGEABLE' : commission.status;
      await prisma.monetizationCommission.update({ where: { id: commission.id }, data: { mpStatus: payment.status, status: newStatus, paidAt: payment.status === 'approved' ? new Date() : null } });
    }
    R.ok(res, { paymentId: commission.mpPaymentId, mpStatus: payment.status, commissionStatus: commission.status, amount: commission.commissionAmount, paidAt: commission.paidAt });
  } catch(e) { next(e); }
});

router.post('/webhook/mp', async (req, res) => {
  try {
    const dataId = (req.query?.['data.id'] || req.body?.data?.id || '');
    const valid = verifyMpWebhookSignature({
      secret: MP_WEBHOOK_SECRET,
      signatureHeader: req.headers['x-signature'],
      requestId: req.headers['x-request-id'],
      dataId,
    });
    if (!valid) return res.status(401).json({ ok: false });
    const { type, data } = req.body || {};
    if (type !== 'payment' || !data?.id) return res.status(200).json({ ok: true, ignored: true });
    const payment = await mpFetch(`/v1/payments/${data.id}`);
    const commissionId = payment.metadata?.commission_id;
    if (!commissionId) return res.status(200).json({ ok: true, ignored: true });
    const commission = await prisma.monetizationCommission.findUnique({ where: { id: commissionId } });
    if (!commission) return res.status(200).json({ ok: true, not_found: true });
    const statusMap = { approved:'PAID', cancelled:'CHARGEABLE', rejected:'CHARGEABLE', refunded:'REFUNDED', in_process:'PENDING', pending:'PENDING' };
    const newStatus = statusMap[payment.status] || commission.status;
    await prisma.monetizationCommission.update({ where: { id: commissionId }, data: { mpStatus: payment.status, status: newStatus, paidAt: payment.status === 'approved' ? new Date() : commission.paidAt } });
    res.status(200).json({ ok: true, commissionId, newStatus });
  } catch(e) {
    console.error('[MP Webhook]', e.message);
    res.status(200).json({ ok: false, error: e.message });
  }
});

// ── Webhook MP para pagamentos de emergência (Fase 5) ─────────────────────
router.post('/webhook/mp-emergency', async (req, res) => {
  try {
    const dataId = (req.query?.['data.id'] || req.body?.data?.id || '');
    const valid = verifyMpWebhookSignature({
      secret:          MP_WEBHOOK_SECRET,
      signatureHeader: req.headers['x-signature'],
      requestId:       req.headers['x-request-id'],
      dataId,
    });
    if (!valid) return res.status(401).json({ ok: false });

    const { type, data } = req.body || {};
    if (type !== 'payment' || !data?.id) return res.status(200).json({ ok: true, ignored: true });

    const payment = await mpFetch(`/v1/payments/${data.id}`);
    const emergencyId = payment.metadata?.emergency_id;
    if (!emergencyId || payment.metadata?.mobya_type !== 'EMERGENCY_PAYMENT') {
      return res.status(200).json({ ok: true, ignored: true });
    }

    if (payment.status === 'approved') {
      await handleEmergencyPaymentApproved(emergencyId, String(payment.id));
    } else if (['cancelled', 'rejected', 'refunded'].includes(payment.status)) {
      await prisma.emergency.update({
        where: { id: emergencyId },
        data:  { customerPaymentStatus: payment.status === 'refunded' ? 'REFUNDED' : 'UNPAID' },
      }).catch(() => {});
    }

    res.status(200).json({ ok: true, emergencyId, mpStatus: payment.status });
  } catch (e) {
    console.error('[MP Webhook Emergency]', e.message);
    res.status(200).json({ ok: false, error: e.message });
  }
});


export default router;
