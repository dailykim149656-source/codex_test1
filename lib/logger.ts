import type { AppErrorCode } from "./errors";

type ErrorLogContext = {
  requestId: string;
  path: string;
  method: string;
  code: AppErrorCode;
  user?: string;
  tenant?: string;
};

export function logError(
  error: unknown,
  context: ErrorLogContext
) {
  const stack = error instanceof Error ? error.stack : undefined;

  const payload = {
    level: "error",
    requestId: context.requestId,
    user: context.user ?? "anonymous",
    tenant: context.tenant ?? "unknown",
    path: context.path,
    method: context.method,
    code: context.code,
    stack,
  };

  console.error(JSON.stringify(payload));
}
