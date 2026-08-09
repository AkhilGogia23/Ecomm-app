interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export function rateLimiter(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  const allowed = bucket.count <= maxAttempts;
  const remaining = Math.max(0, maxAttempts - bucket.count);

  return { allowed, remaining, resetAt: new Date(bucket.resetAt) };
}

export const loginLimiter = (key: string) => rateLimiter(`login:${key}`, 5, 15 * 60 * 1000);
export const apiLimiter = (key: string) => rateLimiter(`api:${key}`, 100, 60 * 1000);
export const adminLimiter = (key: string) => rateLimiter(`admin:${key}`, 300, 60 * 1000);
