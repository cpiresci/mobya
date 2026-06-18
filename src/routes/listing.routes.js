import { Router } from 'express';
import slugify from 'slugify';
import { prisma } from '../config/database.js';
import { Cache } from '../config/redis.js';
import { R, ApiError } from '../utils/ApiError.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// FIX #5: removido mode:'insensitive' — incompatível com MySQL no Prisma
// MySQL com utf8mb4_unicode_ci já faz buscas case-insensitive nativamente
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { type, query, city, state, minPrice, maxPrice, page=1, limit=20, sort='recent' } = req.query;
    const skip  = (parseInt(page)-1) * parseInt(limit);
    const where = {
      status: 'ACTIVE',
      deletedAt: null,
      ...(type && { type }),
      ...(city  && { city:  { contains: city  } }),
      ...(state && { state }),
      ...((minPrice||maxPrice) && { price: {
        ...(minPrice && { gte: parseFloat(minPrice) }),
        ...(maxPrice && { lte: parseFloat(maxPrice) }),
      }}),
      ...(query && { OR: [
        { title:       { contains: query } },
        { description: { contains: query } },
      ]}),
    };
    const orderBy = {
      recent:     { createdAt: 'desc' },
      price_asc:  { price: 'asc'  },
      price_desc: { price: 'desc' },
      views:      { views: 'desc' },
    }[sort] || { createdAt: 'desc' };
    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where, skip, take: parseInt(limit), orderBy,
        include: {
          user:    { select: { id:true, name:true, avatar:true } },
          vehicle: { select: { brand:true, model:true, year:true, mileage:true } },
        },
      }),
    ]);
    R.paginated(res, listings, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (e) { next(e); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, price, type, city, state, vehicleId, priceNegotiable=true, acceptsTrade=false, images=[] } = req.body;
    if (!title||!description||!price||!type||!city||!state) throw ApiError.badRequest('Campos obrigatórios faltando.');
    const slug = `${slugify(title, { lower:true, strict:true })}-${Date.now()}`;
    const listing = await prisma.listing.create({
      data: {
        userId: req.user.id, vehicleId: vehicleId||null, type, status: 'ACTIVE',
        slug, title, description, price: parseFloat(price),
        priceNegotiable, acceptsTrade, city, state, images,
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 60*24*3600*1000),
      },
      include: { user: { select: { id:true, name:true } } },
    });
    await Cache.delPattern('listings:*');
    R.created(res, listing);
  } catch (e) { next(e); }
});

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const { page=1, limit=20 } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const where = { userId: req.user.id, deletedAt: null };
    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { vehicle: { select: { brand:true, model:true, year:true, mileage:true } } },
      }),
    ]);
    R.paginated(res, listings, { page: parseInt(page), limit: parseInt(limit), total });
  } catch (e) { next(e); }
});

router.get('/:slugOrId', optionalAuth, async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: {
        OR: [{ id: req.params.slugOrId }, { slug: req.params.slugOrId }],
        status: { not: 'REMOVED' },
        deletedAt: null,
      },
      include: {
        user:    { select: { id:true, name:true, avatar:true, phone:true, city:true } },
        vehicle: true,
      },
    });
    if (!listing) throw ApiError.notFound('Anúncio');
    prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } }).catch(() => {});
    R.ok(res, listing);
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({ where: { id: req.params.id, userId: req.user.id, deletedAt: null } });
    if (!listing) throw ApiError.notFound('Anúncio');
    const { title, description, price, city, state, priceNegotiable, acceptsTrade, images, status } = req.body;
    const updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price       !== undefined && { price: parseFloat(price) }),
        ...(city        !== undefined && { city }),
        ...(state       !== undefined && { state }),
        ...(priceNegotiable !== undefined && { priceNegotiable }),
        ...(acceptsTrade    !== undefined && { acceptsTrade }),
        ...(images      !== undefined && { images }),
        ...(status      !== undefined && { status }),
      },
    });
    await Cache.delPattern('listings:*');
    R.ok(res, updated);
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({ where: { id: req.params.id, userId: req.user.id, deletedAt: null } });
    if (!listing) throw ApiError.notFound('Anúncio');
    await prisma.listing.update({ where: { id: listing.id }, data: { deletedAt: new Date(), status: 'REMOVED' } });
    await Cache.delPattern('listings:*');
    R.noContent(res);
  } catch (e) { next(e); }
});

router.post('/:id/favorite', authenticate, async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({ where: { id: req.params.id, status: 'ACTIVE', deletedAt: null } });
    if (!listing) throw ApiError.notFound('Anúncio');
    const existing = await prisma.favorite.findUnique({ where: { userId_listingId: { userId: req.user.id, listingId: listing.id } } });
    if (existing) {
      await prisma.favorite.delete({ where: { userId_listingId: { userId: req.user.id, listingId: listing.id } } });
      await prisma.listing.update({ where: { id: listing.id }, data: { favorites: { decrement: 1 } } });
      R.ok(res, { favorited: false });
    } else {
      await prisma.favorite.create({ data: { userId: req.user.id, listingId: listing.id } });
      await prisma.listing.update({ where: { id: listing.id }, data: { favorites: { increment: 1 } } });
      R.ok(res, { favorited: true });
    }
  } catch (e) { next(e); }
});

export default router;
