// src/shared/errorHandler.ts

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Autentikasi gagal') {
    super('AUTHENTICATION_ERROR', message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Anda tidak memiliki akses') {
    super('AUTHORIZATION_ERROR', message, 403);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} tidak ditemukan`, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super('BAD_REQUEST', message, 400);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Terjadi kesalahan internal') {
    super('INTERNAL_SERVER_ERROR', message, 500);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Terlalu banyak permintaan') {
    super('RATE_LIMIT_ERROR', message, 429);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function formatErrorResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
    },
  };
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}

export function getErrorResponse(error: unknown): ErrorResponse {
  if (isAppError(error)) {
    return formatErrorResponse(error);
  }

  if (error instanceof Error) {
    const appError = new InternalServerError(error.message);
    return formatErrorResponse(appError);
  }

  const appError = new InternalServerError('Terjadi kesalahan yang tidak diketahui');
  return formatErrorResponse(appError);
}