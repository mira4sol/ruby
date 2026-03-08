import { NextFunction, Request, Response } from 'express'
import { z } from 'zod/v4'
import { ValidationError } from '../types/errors'

export const validate =
  (schema: z.ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return next(
        new ValidationError(
          'Invalid request body',
          z.prettifyError(result.error),
        ),
      )
    }
    req.body = result.data
    next()
  }
