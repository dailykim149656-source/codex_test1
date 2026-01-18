import { AppError } from "./errors";

const DEFAULT_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "X-Request-Id",
].join(", ");

const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "OPTIONS"].join(", ");

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

function parseCsv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeOrigin(item));
}

export function getAllowedOrigins() {
  const configured = parseCsv(process.env.APP_ORIGINS);
  if (configured.length > 0) {
    return configured;
  }

  const fallback = parseCsv(process.env.NEXTAUTH_URL);
  return fallback.length > 0 ? fallback : [];
}

export function isOriginAllowed(origin: string | null) {
  if (!origin) {
    return false;
  }
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) {
    return true;
  }
  return allowed.includes(origin);
}

export function buildCorsHeaders(origin: string | null) {
  if (!origin || !isOriginAllowed(origin)) {
    return {};
  }

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": DEFAULT_ALLOWED_METHODS,
    "access-control-allow-headers": DEFAULT_ALLOWED_HEADERS,
    vary: "Origin",
  };
}

export function enforceCsrfProtection(request: Request) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return;
  }

  const origin = request.headers.get("origin");
  if (!origin || !isOriginAllowed(origin)) {
    throw new AppError("FORBIDDEN", "허용되지 않은 요청입니다.", {
      status: 403,
    });
  }
}

export function ensureJsonRequest(request: Request) {
  if (request.method !== "POST") {
    return;
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AppError("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.", {
      status: 400,
      exposeDetails: true,
      details: { field: "content-type" },
    });
  }
}
