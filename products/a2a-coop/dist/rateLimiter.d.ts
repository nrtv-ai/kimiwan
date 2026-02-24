import { WebSocket } from 'ws';
/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
    windowMs: number;
    maxRequests: number;
}
/**
 * RateLimiter provides request rate limiting for WebSocket connections.
 *
 * Uses a sliding window algorithm to track requests per client.
 * When a client exceeds the rate limit, their requests are rejected
 * until the window resets.
 *
 * Usage:
 * ```typescript
 * const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 100 });
 *
 * if (!limiter.checkLimit(clientId)) {
 *   // Reject request - rate limit exceeded
 * }
 * ```
 */
export declare class RateLimiter {
    private clients;
    private config;
    constructor(config?: Partial<RateLimiterConfig>);
    /**
     * Check if a client has exceeded their rate limit
     * @param clientId - Unique client identifier
     * @returns true if request is allowed, false if rate limited
     */
    checkLimit(clientId: string): boolean;
    /**
     * Get remaining requests for a client
     * @param clientId - Unique client identifier
     * @returns Number of remaining requests in current window
     */
    getRemainingRequests(clientId: string): number;
    /**
     * Get time until rate limit resets for a client
     * @param clientId - Unique client identifier
     * @returns Milliseconds until reset, or 0 if not rate limited
     */
    getTimeUntilReset(clientId: string): number;
    /**
     * Reset rate limit for a specific client
     * @param clientId - Unique client identifier
     */
    resetClient(clientId: string): void;
    /**
     * Clean up expired entries (call periodically)
     */
    cleanup(): void;
    /**
     * Get current configuration
     */
    getConfig(): RateLimiterConfig;
}
/**
 * WebSocket-specific rate limiter that uses the WebSocket object as client identifier
 */
export declare class WebSocketRateLimiter extends RateLimiter {
    private wsToId;
    private idCounter;
    /**
     * Get or create a client ID for a WebSocket
     */
    private getClientId;
    /**
     * Check rate limit for a WebSocket connection
     */
    checkWebSocketLimit(ws: WebSocket): boolean;
    /**
     * Get remaining requests for a WebSocket connection
     */
    getWebSocketRemaining(ws: WebSocket): number;
    /**
     * Get time until reset for a WebSocket connection
     */
    getWebSocketTimeUntilReset(ws: WebSocket): number;
}
//# sourceMappingURL=rateLimiter.d.ts.map