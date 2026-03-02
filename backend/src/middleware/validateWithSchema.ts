import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Creates an Express middleware for validating request body or query using a Zod schema.
 * @param schema - The Zod schema to validate against.
 * @param property - The property of the request to validate: 'body' or 'query'.
 * @returns Express middleware function.
 */
export function validateWithSchema<T extends object>(
  schema: ZodSchema<T>,
  property: 'body' | 'query'
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      const errors = (result.error as ZodError).errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }
    next();
  };
}
