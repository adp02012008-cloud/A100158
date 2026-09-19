/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects endpoints from Denial of Service (DoS), brute force, and API spamming.
 */
class MemoryRateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 300, message = "Too many requests, please try again later.") {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    this.hits = new Map();

    // Clean up expired buckets every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of this.hits.entries()) {
        if (now - record.startTime > this.windowMs) {
          this.hits.delete(ip);
        }
      }
    }, 5 * 60 * 1000);
  }

  middleware() {
    return (req, res, next) => {
      // Extract client IP address (supporting reverse proxies like Render/Cloudflare)
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        "unknown-ip";

      const now = Date.now();
      let record = this.hits.get(ip);

      if (!record || now - record.startTime > this.windowMs) {
        record = { count: 1, startTime: now };
        this.hits.set(ip, record);
      } else {
        record.count++;
      }

      res.setHeader("X-RateLimit-Limit", this.maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, this.maxRequests - record.count));

      if (record.count > this.maxRequests) {
        res.setHeader("Retry-After", Math.ceil((record.startTime + this.windowMs - now) / 1000));
        return res.status(429).json({
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: this.message,
        });
      }

      next();
    };
  }
}

// 1. General API Limiter: 500 requests per 15-minute window per IP
export const apiRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1000,
  500,
  "You have exceeded the request limit. Please try again in a few minutes."
).middleware();

// 2. Strict Rate Limiter: 30 requests per 15-minute window for sensitive/heavy triggers
export const strictRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1000,
  30,
  "Too many requests on this endpoint. Please wait before retrying."
).middleware();
