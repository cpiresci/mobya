import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../config/database.js';
import { Cache, getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';
import { ApiError, R } from '../utils/ApiError.js';
import { authenticate, authRateLimiter } from '../middleware/auth.js';

const router = Router();

// REGISTER
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) throw ApiError.badRequest('Nome, email e senha são obrigatórios.');
    if (password.length < 8) throw ApiError.badRequest('Senha deve ter mínimo 8 caracteres.');
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] } });
    if (existing) throw ApiError.conflict('Email ou telefone já cadastrado.');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase().trim(), phone: phone || null, passwordHash, status: 'ACTIVE' },
      select: { id:true, name:true, email:true, role:true, status:true },
    });
    R.created(res, user, 'Cadastro realizado com sucesso!');
  } catch (e) { next(e); }
});

// LOGIN
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw ApiError.badRequest('Email e senha são obrigatórios.');
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id:true, email:true, name:true, passwordHash:true, role:true, status:true, avatar:true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw ApiError.unauthorized('Email ou senha inválidos.');
    if (user.status === 'BANNED')     throw ApiError.forbidden('Conta banida.');
    if (user.status === 'SUSPENDED')  throw ApiError.forbidden('Conta suspensa.');
    const accessToken  = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 30*24*3600*1000) } });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: req.ip, status: 'ACTIVE' } }).catch(() => {});
    // FIX #1: sameSite 'none' permite cookie cross-origin (mobya.com.br → onrender.com)
    // 'strict' bloqueava o cookie em requests entre domínios diferentes
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 30*24*3600*1000,
    });
    const { passwordHash: _, ...safeUser } = user;
    R.ok(res, { user: safeUser, accessToken, expiresIn: '7d' });
  } catch (e) { next(e); }
});

// REFRESH
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw ApiError.unauthorized('Refresh token não fornecido.');
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const stored  = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revokedAt || new Date() > stored.expiresAt) throw ApiError.unauthorized('Token expirado.');
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id:true, email:true, name:true, role:true, status:true } });
    if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized('Usuário inativo.');
    await prisma.refreshToken.update({ where: { token }, data: { revokedAt: new Date() } });
    const newAccess  = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const newRefresh = jwt.sign({ sub: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
    await prisma.refreshToken.create({ data: { token: newRefresh, userId: user.id, expiresAt: new Date(Date.now() + 30*24*3600*1000) } });
    // FIX #1: mesmo fix no refresh
    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 30*24*3600*1000,
    });
    R.ok(res, { user, accessToken: newAccess });
  } catch (e) { next(e); }
});

// LOGOUT
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      let decoded = null;
      try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { decoded = null; }
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          if (getRedis()) {
            await Cache.set(`blacklist:${token}`, 1, ttl);
          } else {
            logger.warn('[Auth] Redis indisponível no logout — access token não pôde ser invalidado.');
          }
        }
      }
    }
    const rt = req.cookies?.refreshToken;
    if (rt) await prisma.refreshToken.updateMany({ where: { token: rt, revokedAt: null }, data: { revokedAt: new Date() } }).catch(() => {});
    res.clearCookie('refreshToken');
    R.ok(res, null, 'Logout realizado.');
  } catch (e) { next(e); }
});

// ME
router.get('/me', authenticate, (req, res) => R.ok(res, req.user));

export default router;
