import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { ACCESS_COOKIE, verifyAccessToken } from '../modules/auth/tokens';

function extractToken(req: Request): string | undefined {
  const cookieToken = (req.cookies as Record<string, string | undefined>)[ACCESS_COOKIE];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return undefined;
}

/** Rejects the request unless a valid access token is present. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(new UnauthorizedError());
    return;
  }
  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
}

/** Attaches the user when a token is present but never blocks the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    // An invalid token on an optional route is simply treated as anonymous.
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  if (req.user.role !== 'ADMIN') {
    next(new ForbiddenError('This action requires an administrator account'));
    return;
  }
  next();
}

/** Narrowing helper — routes behind requireAuth always have a user. */
export function currentUser(req: Request): Express.AuthenticatedUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
