type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, config: RateLimitConfig) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt,
      limit: config.max,
    };
  }

  if (existing.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: config.max,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, config.max - existing.count),
    resetAt: existing.resetAt,
    limit: config.max,
  };
}

export function rateLimitHeaders(limit: number, remaining: number, resetAt: number) {
  return {
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-reset": String(Math.ceil(resetAt / 1000)),
  };
}
