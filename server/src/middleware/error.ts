import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, NotFoundError } from '../lib/errors';
import { isProduction } from '../config/env';
import { logger } from '../lib/logger';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist`));
}

function translatePrismaError(error: unknown): AppError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return new AppError('Resource already exists', 409, 'CONFLICT');
    if (error.code === 'P2025') return new NotFoundError('Resource not found');
    if (error.code === 'P2003')
      return new AppError('Related resource does not exist', 400, 'BAD_REQUEST');
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Invalid database query', 400, 'BAD_REQUEST');
  }
  return null;
}

/** Terminal error middleware. Never leaks stack traces or driver internals in production. */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = error instanceof AppError ? error : translatePrismaError(error);

  if (appError) {
    if (appError.statusCode >= 500) {
      logger.error(appError.message, { path: req.originalUrl, code: appError.code });
    }
    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      },
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error('Unhandled error', {
    path: req.originalUrl,
    method: req.method,
    message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'Something went wrong on our end' : message,
    },
  });
}
