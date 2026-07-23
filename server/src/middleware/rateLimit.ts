import rateLimit from 'express-rate-limit';
import { env, isTest } from '../config/env';

const shared = {
  standardHeaders: true as const,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' },
  },
};

/** Broad protection for the whole API surface. */
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** Much tighter budget for credential endpoints to blunt brute-force attempts. */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
});
