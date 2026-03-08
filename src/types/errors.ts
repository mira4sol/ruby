export class AppError extends Error {
  public readonly isAppError = true

  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class PolicyViolationError extends AppError {
  constructor(rule: string) {
    super(`Transaction blocked by policy: ${rule}`, 'POLICY_VIOLATION', 403)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(walletAddress: string) {
    super(
      `Insufficient balance in wallet: ${walletAddress}`,
      'INSUFFICIENT_BALANCE',
      400,
    )
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
  }
}
