import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/http';
import { currentUser } from '../../middleware/auth';
import * as authService from './service';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  clearCookieOptions,
  refreshCookieOptions,
} from './tokens';
import { UnauthorizedError } from '../../lib/errors';

function sessionContext(req: Request): authService.SessionContext {
  return {
    userAgent: req.get('user-agent') ?? undefined,
    ipAddress: req.ip,
  };
}

function setAuthCookies(res: Response, result: authService.AuthResult): void {
  res.cookie(ACCESS_COOKIE, result.accessToken, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
}

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, sessionContext(req));
  setAuthCookies(res, result);
  res.status(201).json({ success: true, data: { user: result.user } });
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, sessionContext(req));
  setAuthCookies(res, result);
  res.json({ success: true, data: { user: result.user } });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  if (!token) throw new UnauthorizedError('No active session');

  const result = await authService.refresh(token, sessionContext(req));
  setAuthCookies(res, result);
  res.json({ success: true, data: { user: result.user } });
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout((req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE]);
  res.clearCookie(ACCESS_COOKIE, clearCookieOptions());
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
  res.json({ success: true, data: { message: 'Signed out' } });
});

export const logoutAllHandler = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(currentUser(req).id);
  res.clearCookie(ACCESS_COOKIE, clearCookieOptions());
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
  res.json({ success: true, data: { message: 'Signed out of all devices' } });
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getProfile(currentUser(req).id);
  res.json({ success: true, data: { user } });
});

export const updateProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(currentUser(req).id, req.body);
  res.json({ success: true, data: { user } });
});
