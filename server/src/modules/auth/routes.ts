import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { loginSchema, registerSchema, updateProfileSchema } from './schemas';
import {
  loginHandler,
  logoutAllHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
  updateProfileHandler,
} from './controller';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), registerHandler);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.post('/logout-all', requireAuth, logoutAllHandler);
authRouter.get('/me', requireAuth, meHandler);
authRouter.patch('/me', requireAuth, validate({ body: updateProfileSchema }), updateProfileHandler);
