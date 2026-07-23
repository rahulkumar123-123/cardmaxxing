import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { BadRequestError } from '../lib/errors';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and *replaces* the request segments with their parsed output, so downstream
 * handlers receive coerced, trusted values rather than raw strings.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new BadRequestError(
            'Validation failed',
            error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          ),
        );
        return;
      }
      next(error);
    }
  };
}
