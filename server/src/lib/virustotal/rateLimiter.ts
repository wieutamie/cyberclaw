import { env } from '../../config/env.js';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export class RateLimiter {
  private static maxTokens = env.VT_RATE_LIMIT_PER_MIN;
  private static refillRatePerMs = env.VT_RATE_LIMIT_PER_MIN / (60 * 1000); // tokens per ms

  static tryConsume(apiKey: string): { success: boolean; retryAfter: number } {
    const now = Date.now();
    let bucket = buckets.get(apiKey);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      buckets.set(apiKey, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      const refilled = elapsed * this.refillRatePerMs;
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refilled);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { success: true, retryAfter: 0 };
    }

    const needed = 1 - bucket.tokens;
    const retryAfter = Math.ceil(needed / this.refillRatePerMs / 1000);
    return { success: false, retryAfter: Math.max(1, retryAfter) };
  }
}
