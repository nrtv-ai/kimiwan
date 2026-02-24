"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketRateLimiter = exports.RateLimiter = void 0;
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
class RateLimiter {
    clients = new Map();
    config;
    constructor(config = {}) {
        this.config = {
            windowMs: config.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
            maxRequests: config.maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        };
    }
    /**
     * Check if a client has exceeded their rate limit
     * @param clientId - Unique client identifier
     * @returns true if request is allowed, false if rate limited
     */
    checkLimit(clientId) {
        const now = Date.now();
        const clientLimit = this.clients.get(clientId);
        if (!clientLimit) {
            // First request from this client
            this.clients.set(clientId, {
                count: 1,
                windowStart: now,
            });
            return true;
        }
        // Check if window has expired
        if (now - clientLimit.windowStart > this.config.windowMs) {
            // Reset window
            this.clients.set(clientId, {
                count: 1,
                windowStart: now,
            });
            return true;
        }
        // Check if under limit
        if (clientLimit.count < this.config.maxRequests) {
            clientLimit.count++;
            return true;
        }
        // Rate limit exceeded
        return false;
    }
    /**
     * Get remaining requests for a client
     * @param clientId - Unique client identifier
     * @returns Number of remaining requests in current window
     */
    getRemainingRequests(clientId) {
        const now = Date.now();
        const clientLimit = this.clients.get(clientId);
        if (!clientLimit) {
            return this.config.maxRequests;
        }
        // Check if window has expired
        if (now - clientLimit.windowStart > this.config.windowMs) {
            return this.config.maxRequests;
        }
        return Math.max(0, this.config.maxRequests - clientLimit.count);
    }
    /**
     * Get time until rate limit resets for a client
     * @param clientId - Unique client identifier
     * @returns Milliseconds until reset, or 0 if not rate limited
     */
    getTimeUntilReset(clientId) {
        const clientLimit = this.clients.get(clientId);
        if (!clientLimit) {
            return 0;
        }
        const now = Date.now();
        const resetTime = clientLimit.windowStart + this.config.windowMs;
        return Math.max(0, resetTime - now);
    }
    /**
     * Reset rate limit for a specific client
     * @param clientId - Unique client identifier
     */
    resetClient(clientId) {
        this.clients.delete(clientId);
    }
    /**
     * Clean up expired entries (call periodically)
     */
    cleanup() {
        const now = Date.now();
        for (const [clientId, limit] of this.clients.entries()) {
            if (now - limit.windowStart > this.config.windowMs) {
                this.clients.delete(clientId);
            }
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.RateLimiter = RateLimiter;
/**
 * WebSocket-specific rate limiter that uses the WebSocket object as client identifier
 */
class WebSocketRateLimiter extends RateLimiter {
    wsToId = new Map();
    idCounter = 0;
    /**
     * Get or create a client ID for a WebSocket
     */
    getClientId(ws) {
        let clientId = this.wsToId.get(ws);
        if (!clientId) {
            clientId = `ws_${++this.idCounter}_${Date.now()}`;
            this.wsToId.set(ws, clientId);
            // Clean up when socket closes
            ws.on('close', () => {
                this.wsToId.delete(ws);
            });
        }
        return clientId;
    }
    /**
     * Check rate limit for a WebSocket connection
     */
    checkWebSocketLimit(ws) {
        return this.checkLimit(this.getClientId(ws));
    }
    /**
     * Get remaining requests for a WebSocket connection
     */
    getWebSocketRemaining(ws) {
        return this.getRemainingRequests(this.getClientId(ws));
    }
    /**
     * Get time until reset for a WebSocket connection
     */
    getWebSocketTimeUntilReset(ws) {
        return this.getTimeUntilReset(this.getClientId(ws));
    }
}
exports.WebSocketRateLimiter = WebSocketRateLimiter;
//# sourceMappingURL=rateLimiter.js.map