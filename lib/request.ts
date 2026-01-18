import { randomUUID } from "crypto";

export function getRequestId(request: Request) {
  const headerValue =
    request.headers.get("x-request-id") ??
    request.headers.get("x-amzn-trace-id") ??
    request.headers.get("x-correlation-id");
  return headerValue && headerValue.length > 0 ? headerValue : randomUUID();
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
