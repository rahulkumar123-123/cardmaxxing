import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler, paginate } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { currentUser, requireAuth } from '../../middleware/auth';
import { NotFoundError } from '../../lib/errors';

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
const idSchema = z.object({ id: z.string().trim().min(1) });

export const historyRouter = Router();
historyRouter.use(requireAuth);

historyRouter.get(
  '/',
  validate({ query: listSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as unknown as z.infer<typeof listSchema>;
    const userId = currentUser(req).id;

    const [items, total] = await prisma.$transaction([
      prisma.recommendationHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: { orderBy: { rank: 'asc' }, include: { card: true } },
        },
      }),
      prisma.recommendationHistory.count({ where: { userId } }),
    ]);

    res.json({ success: true, data: paginate(items, total, page, pageSize) });
  }),
);

historyRouter.get(
  '/:id',
  validate({ params: idSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const run = await prisma.recommendationHistory.findFirst({
      where: { id: req.params.id!, userId: currentUser(req).id },
      include: { items: { orderBy: { rank: 'asc' }, include: { card: true } } },
    });
    if (!run) throw new NotFoundError('Recommendation run not found');
    res.json({ success: true, data: { run } });
  }),
);

historyRouter.delete(
  '/:id',
  validate({ params: idSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { count } = await prisma.recommendationHistory.deleteMany({
      where: { id: req.params.id!, userId: currentUser(req).id },
    });
    if (count === 0) throw new NotFoundError('Recommendation run not found');
    res.json({ success: true, data: { message: 'Deleted' } });
  }),
);
