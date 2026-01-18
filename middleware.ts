import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

function getAllowedOrigins() {
  const configured = parseCsv(process.env.APP_ORIGINS);
  if (configured.length > 0) {
    return configured;
  }
  const fallback = parseCsv(process.env.NEXTAUTH_URL);
  return fallback.length > 0 ? fallback : [];
}

function buildCorsHeaders(origin: string | null) {
  if (!origin) {
    return {};
  }
  const allowed = getAllowedOrigins();
  if (allowed.length > 0 && !allowed.includes(origin)) {
    return {};
  }

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, X-Requested-With, X-Request-Id",
    vary: "Origin",
  };
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const origin = request.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "x-request-id": requestId,
        ...corsHeaders,
      },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
