import Redis from "ioredis";

type Strategy = "memory" | "redis" | "proxy";

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const strategy = ((process.env.AUTH_RATE_LIMIT_STRATEGY || "").trim().toLowerCase() as Strategy) || "memory";
const redisUrl = process.env.REDIS_URL?.trim();

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

let redisClient: Redis | null = null;

function getRedisClient() {
  if (!redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  return redisClient;
}

export function validateRateLimitConfigForProduction() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (strategy === "memory") {
    throw new Error("AUTH_RATE_LIMIT_STRATEGY=memory is not allowed in production. Use redis or proxy.");
  }

  if (strategy === "redis" && !redisUrl) {
    throw new Error("REDIS_URL is required when AUTH_RATE_LIMIT_STRATEGY=redis.");
  }
}

export async function checkAuthRateLimit(key: string, limit: number, windowMs = AUTH_RATE_LIMIT_WINDOW_MS) {
  if (strategy === "proxy") {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (strategy === "redis") {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis rate limiting is enabled but REDIS_URL is missing.");
    }

    if (redis.status === "wait") {
      await redis.connect();
    }

    const bucketKey = `auth-rate:${key}`;
    const count = await redis.incr(bucketKey);
    if (count === 1) {
      await redis.pexpire(bucketKey, windowMs);
    }

    if (count > limit) {
      const ttlMs = await redis.pttl(bucketKey);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttlMs, 1000) / 1000)),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  memoryBuckets.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}
