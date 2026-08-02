export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Autentikasi gagal') {
    super('AUTHENTICATION_ERROR', 401, message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Anda tidak memiliki akses ke resource ini') {
    super('AUTHORIZATION_ERROR', 403, message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND_ERROR', 404, `${resource} tidak ditemukan`);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT_ERROR', 409, message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Terjadi kesalahan internal') {
    super('INTERNAL_SERVER_ERROR', 500, message);
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Terlalu banyak permintaan, coba lagi nanti') {
    super('RATE_LIMIT_ERROR', 429, message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId?: string;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export const formatErrorResponse = (
  error: unknown,
  requestId?: string
): ErrorResponse => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new InternalServerError(error.message);
  } else {
    appError = new InternalServerError('Kesalahan tidak diketahui');
  }

  return {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
};

export const formatSuccessResponse = <T>(
  data: T,
  meta?: SuccessResponse<T>['meta']
): SuccessResponse<T> => {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
};

export const asyncHandler =
  (fn: Function) =>
  (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const errorMiddleware = (
  err: Error | AppError,
  req: any,
  res: any,
  next: any
) => {
  const requestId = req.id || req.headers['x-request-id'];

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(formatErrorResponse(err, requestId));
  }

  console.error('[ERROR]', err);

  return res
    .status(500)
    .json(
      formatErrorResponse(
        new InternalServerError('Terjadi kesalahan internal'),
        requestId
      )
    );
};