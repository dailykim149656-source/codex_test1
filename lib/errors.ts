export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

type AppErrorOptions = {
  status: number;
  details?: Record<string, unknown>;
  exposeDetails?: boolean;
  cause?: unknown;
};

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly exposeDetails: boolean;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions) {
    super(message);
    this.code = code;
    this.status = options.status;
    this.details = options.details;
    this.exposeDetails = options.exposeDetails ?? false;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

  return new AppError("INTERNAL_ERROR", message, {
    status: 500,
    exposeDetails: false,
    cause: error,
  });
}

export function isSafeDetails(
  details?: Record<string, unknown>
): details is Record<string, unknown> {
  return Boolean(details && typeof details === "object");
}
