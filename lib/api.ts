import { NextResponse } from "next/server";
import { AppError, toAppError, isSafeDetails } from "./errors";
import { logError } from "./logger";
import { getClientIp, getRequestId } from "./request";
import { buildCorsHeaders, enforceCsrfProtection, ensureJsonRequest } from "./security";
import { checkRateLimit, rateLimitHeaders } from "./rate-limit";
import { writeAuditLog } from "./audit-log";
import { assertServerConfig } from "./env";

type Actor = {
  user: string;
  tenant: string;
  role: string;
};

type ApiContext = {
  requestId: string;
  path: string;
  method: string;
  origin: string | null;
  ip: string;
  actor?: Actor;
  audit?: {
    action: string;
    metadata?: Record<string, unknown>;
  };
  setActor: (actor: Actor) => void;
  setAudit: (audit: { action: string; metadata?: Record<string, unknown> }) => void;
  applyRateLimit: (key: string, config: { windowMs: number; max: number }) => void;
};

type Handler = (context: ApiContext) => Promise<NextResponse>;

const isProduction = process.env.NODE_ENV === "production";

function withHeaders(
  response: NextResponse,
  headers: Record<string, string>
) {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function errorMessage(error: AppError) {
  if (error.code === "INTERNAL_ERROR" && isProduction) {
    return "서버 오류가 발생했습니다.";
  }
  return error.message;
}

export async function handleApi(request: Request, handler: Handler) {
  const requestId = getRequestId(request);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const origin = request.headers.get("origin");
  const ip = getClientIp(request);
  const corsHeaders = buildCorsHeaders(origin);
  let rateHeaders: Record<string, string> = {};

  const context: ApiContext = {
    requestId,
    path,
    method,
    origin,
    ip,
    setActor: (actor: Actor) => {
      context.actor = actor;
    },
    setAudit: (audit) => {
      context.audit = audit;
    },
    applyRateLimit: (key, config) => {
      const result = checkRateLimit(key, config);
      rateHeaders = rateLimitHeaders(
        result.limit,
        result.remaining,
        result.resetAt
      );
      if (!result.allowed) {
        throw new AppError("RATE_LIMITED", "요청이 너무 많습니다.", {
          status: 429,
        });
      }
    },
  };

  try {
    assertServerConfig();
    enforceCsrfProtection(request);
    ensureJsonRequest(request);
    const response = await handler(context);
    if (context.audit && context.actor) {
      await writeAuditLog({
        timestamp: new Date().toISOString(),
        requestId,
        user: context.actor.user,
        tenant: context.actor.tenant,
        path,
        action: context.audit.action,
        outcome: "success",
        metadata: context.audit.metadata,
      });
    }
    const safeHeaders: Record<string, string> = {
      "x-request-id": requestId,
      ...Object.fromEntries(
        Object.entries(corsHeaders ?? {}).filter(([_, v]) => v !== undefined)
      ),
      ...Object.fromEntries(
        Object.entries(rateHeaders ?? {}).filter(([_, v]) => v !== undefined)
      ),
    };
    return withHeaders(response, safeHeaders);
  } catch (error) {
    const appError = toAppError(error);
    if (context.audit && context.actor) {
      await writeAuditLog({
        timestamp: new Date().toISOString(),
        requestId,
        user: context.actor.user,
        tenant: context.actor.tenant,
        path,
        action: context.audit.action,
        outcome: "failure",
        metadata: context.audit.metadata,
      });
    }
    logError(appError, {
      requestId,
      path,
      method,
      code: appError.code,
      user: context.actor?.user,
      tenant: context.actor?.tenant,
    });

    const body: {
      code: string;
      message: string;
      requestId: string;
      details?: Record<string, unknown>;
    } = {
      code: appError.code,
      message: errorMessage(appError),
      requestId,
    };

    if (appError.exposeDetails && isSafeDetails(appError.details)) {
      body.details = appError.details;
    }

    const response = NextResponse.json(body, { status: appError.status });
    const safeHeaders: Record<string, string> = {
      "x-request-id": requestId,
      ...Object.fromEntries(
        Object.entries(corsHeaders ?? {}).filter(([_, v]) => v !== undefined)
      ),
      ...Object.fromEntries(
        Object.entries(rateHeaders ?? {}).filter(([_, v]) => v !== undefined)
      ),
    };
    return withHeaders(response, safeHeaders);
  }
}

export type { ApiContext, Actor };
