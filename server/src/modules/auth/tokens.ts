import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env, isProduction } from '../../config/env';
import { UnauthorizedError } from '../../lib/errors';

export const ACCESS_COOKIE = 'cm_access_token';
export const REFRESH_COOKIE = 'cm_refresh_token';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Your session has expired, please sign in again');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError('Your session has expired, please sign in again');
  }
}

/** Refresh tokens are stored only as digests, so a database leak cannot be replayed. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'none';
  path: string;
  maxAge?: number;
  domain?: string;
}

function cookieOptions(maxAgeMs: number): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    // Cross-site cookies (Vercel front-end -> Render API) require SameSite=None + Secure.
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
  if (env.COOKIE_DOMAIN) options.domain = env.COOKIE_DOMAIN;
  return options;
}

export const accessCookieOptions = (): CookieOptions => cookieOptions(15 * 60 * 1000);
export const refreshCookieOptions = (): CookieOptions =>
  cookieOptions(env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
export const clearCookieOptions = (): Omit<CookieOptions, 'maxAge'> => {
  const { maxAge: _maxAge, ...rest } = cookieOptions(0);
  return rest;
};
