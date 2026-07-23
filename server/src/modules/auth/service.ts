import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors';
import {
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokens';
import type { LoginInput, RegisterInput, UpdateProfileInput } from './schemas';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: User['role'];
  monthlyIncome: number | null;
  creditScore: number | null;
  city: string | null;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: PublicUser;
}

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    monthlyIncome: user.monthlyIncome,
    creditScore: user.creditScore,
    city: user.city,
    createdAt: user.createdAt,
  };
}

async function issueSession(user: User, context: SessionContext): Promise<AuthResult> {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      // Placeholder replaced immediately below; the session id is needed to sign the token.
      refreshTokenHash: `pending:${crypto.randomUUID()}`,
      expiresAt: refreshTokenExpiry(),
      userAgent: context.userAgent ?? null,
      ipAddress: context.ipAddress ?? null,
    },
  });

  const refreshToken = signRefreshToken({ sub: user.id, sid: session.id });
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashToken(refreshToken) },
  });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    refreshToken,
  };
}

export async function register(input: RegisterInput, context: SessionContext): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, env.BCRYPT_ROUNDS),
    },
  });

  return issueSession(user, context);
}

export async function login(input: LoginInput, context: SessionContext): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Always run a hash comparison so response timing does not reveal whether the email exists.
  const passwordHash =
    user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const valid = await bcrypt.compare(input.password, passwordHash);

  if (!user || !valid) throw new UnauthorizedError('Incorrect email or password');

  return issueSession(user, context);
}

/**
 * Rotates a refresh token. The presented token is revoked and replaced, so a stolen
 * token is usable at most once before the legitimate client invalidates it.
 */
export async function refresh(token: string, context: SessionContext): Promise<AuthResult> {
  const payload = verifyRefreshToken(token);
  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });

  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt < new Date() ||
    session.refreshTokenHash !== hashToken(token)
  ) {
    throw new UnauthorizedError('Your session has expired, please sign in again');
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return issueSession(session.user, context);
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');
  return toPublicUser(user);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return toPublicUser(user);
}
