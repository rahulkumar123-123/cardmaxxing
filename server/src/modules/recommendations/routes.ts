import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';
import { optionalAuth } from '../../middleware/auth';
import { aiEnabled } from '../../config/env';
import { recommendSchema, type RecommendRequest } from './schemas';
import { generateRecommendations } from './service';
import { BASE_WEIGHTS, ENGINE_VERSION } from './weights';

export const recommendationsRouter = Router();

/**
 * Recommendations work for anonymous visitors too — signing in only adds history.
 */
recommendationsRouter.post(
  '/',
  optionalAuth,
  validate({ body: recommendSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { preferences, limit, explain } = req.body as RecommendRequest;
    const result = await generateRecommendations({
      preferences,
      limit,
      explain,
      userId: req.user?.id,
    });
    res.json({ success: true, data: result });
  }),
);

/** Transparency endpoint: the exact weights the engine uses, published for inspection. */
recommendationsRouter.get('/engine', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      engineVersion: ENGINE_VERSION,
      deterministic: true,
      aiAvailable: aiEnabled,
      aiRole: 'explanation-only',
      baseWeights: BASE_WEIGHTS,
    },
  });
});
