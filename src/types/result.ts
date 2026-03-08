import { AppError } from './errors'

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E }

export const ok = <T>(data: T): Result<T> => ({ success: true, data })

export const err = <E extends AppError>(error: E): Result<never, E> => ({
  success: false,
  error,
})
