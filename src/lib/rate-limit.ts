/**
 * 速率限制中间件 (Next.js App Router 版本)
 * [INPUT]: 无外部依赖，使用内存存储
 * [OUTPUT]: 提供速率限制辅助函数
 * [POS]: lib/rate-limit.ts - API 速率限制配置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 注意: 生产环境应使用 Redis 版本 (@upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 内存存储 (生产环境应使用 Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * 清理过期的速率限制记录
 * 每分钟执行一次
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  windowMs: number;  // 时间窗口 (毫秒)
  maxRequests: number;  // 最大请求数
}

/**
 * 创建速率限制检查函数
 * @param config - 速率限制配置
 * @returns 检查函数，调用后返回 { success: boolean, remaining: number, resetTime: number }
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;

  return function checkRateLimit(ip: string): {
    success: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const key = ip;
    const entry = rateLimitStore.get(key);

    // 如果没有记录或已过期，创建新记录
    if (!entry || entry.resetTime < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        success: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
      };
    }

    // 增加计数
    entry.count++;
    rateLimitStore.set(key, entry);

    // 检查是否超过限制
    if (entry.count > maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      success: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  };
}

/**
 * 从请求中提取 IP 地址
 */
export function getClientIp(request: Request): string {
  // 检查各种代理头
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // 默认为 unknown
  return 'unknown';
}

// ============================================
// 预配置的速率限制器
// ============================================

/**
 * 默认速率限制: 15分钟窗口内最多100次请求
 */
export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
});

/**
 * 严格速率限制: 1分钟窗口内最多10次请求 (用于敏感操作)
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  maxRequests: 10,
});

/**
 * 宽松速率限制: 1分钟窗口内最多60次请求 (用于读取操作)
 */
export const relaxedRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  maxRequests: 60,
});

/**
 * API 速率限制检查函数
 * 返回 429 状态的 Response 如果超过限制
 */
export async function withRateLimit<T>(
  request: Request,
  limiter: ReturnType<typeof createRateLimiter>,
  handler: () => Promise<T>
): Promise<T | Response> {
  const ip = getClientIp(request);
  const result = limiter(ip);

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      }
    );
  }

  return handler();
}
