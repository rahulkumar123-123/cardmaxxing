import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { corsOrigins, env, aiEnabled } from './config/env';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './modules/auth/routes';
import { cardsRouter } from './modules/cards/routes';
import { favoritesRouter } from './modules/favorites/routes';
import { historyRouter } from './modules/history/routes';
import { recommendationsRouter } from './modules/recommendations/routes';

export function createApp(): Express {
  const app = express();

  // Render and most PaaS providers terminate TLS at a proxy; trust it so
  // rate limiting and req.ip see the real client address.
  if (env.TRUST_PROXY) app.set('trust proxy', 1);

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: false, // The API serves JSON only; the SPA sets its own CSP.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: { status: 'ok', uptime: process.uptime(), aiAvailable: aiEnabled },
    });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/cards', cardsRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/recommendations', recommendationsRouter);
  app.use('/api/history', historyRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
