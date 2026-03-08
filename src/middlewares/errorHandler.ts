import { NextFunction, Request, Response } from 'express'
import { AppError } from '../types/errors'

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (
    error instanceof AppError ||
    (error &&
      typeof error === 'object' &&
      'isAppError' in error &&
      error.isAppError)
  ) {
    const appErr = error as AppError
    res.status(appErr.statusCode).json({
      success: false,
      code: appErr.code,
      message: appErr.message,
      ...(appErr.details ? { details: appErr.details } : {}),
    })
    return
  }

  console.error('[Unhandled Error]', error)
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  })
}
