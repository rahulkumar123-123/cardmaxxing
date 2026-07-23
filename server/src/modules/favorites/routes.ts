import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { currentUser, requireAuth } from '../../middleware/auth';
import { NotFoundError } from '../../lib/errors';

const createSchema = z.object({
  cardId: z.string().trim().min(1, 'cardId is required'),
  note: z.string().trim().max(280).optional(),
});
const paramsSchema = z.object({ cardId: z.string().trim().min(1) });

export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

favoritesRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: currentUser(req).id },
      include: { card: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { favorites } });
  }),
);

favoritesRouter.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { cardId, note } = req.body as z.infer<typeof createSchema>;
    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundError('Card not found');

    const favorite = await prisma.favorite.upsert({
      where: { userId_cardId: { userId: currentUser(req).id, cardId } },
      create: { userId: currentUser(req).id, cardId, note: note ?? null },
      update: { note: note ?? null },
      include: { card: true },
    });
    res.status(201).json({ success: true, data: { favorite } });
  }),
);

favoritesRouter.delete(
  '/:cardId',
  validate({ params: paramsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { count } = await prisma.favorite.deleteMany({
      where: { userId: currentUser(req).id, cardId: req.params.cardId! },
    });
    if (count === 0) throw new NotFoundError('That card is not in your favourites');
    res.json({ success: true, data: { message: 'Removed from favourites' } });
  }),
);
