import { RateLimiter, WebSocketRateLimiter } from '../src/rateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 1000, // 1 second window for testing
      maxRequests: 5,
    });
  });

  describe('checkLimit', () => {
    it('should allow requests under the limit', () => {
      const clientId = 'client-1';
      
      for (let i = 0; i < 5; i++) {
        expect(limiter.checkLimit(clientId)).toBe(true);
      }
    });

    it('should reject requests over the limit', () => {
      const clientId = 'client-1';
      
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(clientId);
      }
      
      // Next request should be rejected
      expect(limiter.checkLimit(clientId)).toBe(false);
    });

    it('should track different clients separately', () => {
      const client1 = 'client-1';
      const client2 = 'client-2';
      
      // Use up client1's limit
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(client1);
      }
      
      // client1 should be rate limited
      expect(limiter.checkLimit(client1)).toBe(false);
      
      // client2 should still have requests
      expect(limiter.checkLimit(client2)).toBe(true);
    });

    it('should reset after window expires', async () => {
      const clientId = 'client-1';
      
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(clientId);
      }
      
      expect(limiter.checkLimit(clientId)).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be allowed again
      expect(limiter.checkLimit(clientId)).toBe(true);
    });
  });

  describe('getRemainingRequests', () => {
    it('should return max requests for new client', () => {
      expect(limiter.getRemainingRequests('new-client')).toBe(5);
    });

    it('should decrease as requests are made', () => {
      const clientId = 'client-1';
      
      limiter.checkLimit(clientId);
      expect(limiter.getRemainingRequests(clientId)).toBe(4);
      
      limiter.checkLimit(clientId);
      expect(limiter.getRemainingRequests(clientId)).toBe(3);
    });

    it('should return 0 when rate limited', () => {
      const clientId = 'client-1';
      
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit(clientId);
      }
      
      expect(limiter.getRemainingRequests(clientId)).toBe(0);
    });
  });

  describe('getTimeUntilReset', () => {
    it('should return 0 for new client', () => {
      expect(limiter.getTimeUntilReset('new-client')).toBe(0);
    });

    it('should return positive time for rate limited client', () => {
      const clientId = 'client-1';
      
      limiter.checkLimit(clientId);
      
      const timeUntilReset = limiter.getTimeUntilReset(clientId);
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(1000);
    });
  });

  describe('resetClient', () => {
    it('should reset client limit', () => {
      const clientId = 'client-1';
      
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit(clientId);
      }
      
      expect(limiter.checkLimit(clientId)).toBe(false);
      
      // Reset client
      limiter.resetClient(clientId);
      
      // Should be allowed again
      expect(limiter.checkLimit(clientId)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const clientId = 'client-1';
      
      limiter.checkLimit(clientId);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Cleanup should remove expired entry
      limiter.cleanup();
      
      // Should appear as new client
      expect(limiter.getRemainingRequests(clientId)).toBe(5);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = limiter.getConfig();
      expect(config.windowMs).toBe(1000);
      expect(config.maxRequests).toBe(5);
    });
  });

  describe('environment variable configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use environment variables when no config provided', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '30000';
      process.env.RATE_LIMIT_MAX_REQUESTS = '50';
      
      const envLimiter = new RateLimiter();
      const config = envLimiter.getConfig();
      
      expect(config.windowMs).toBe(30000);
      expect(config.maxRequests).toBe(50);
    });
  });
});

describe('WebSocketRateLimiter', () => {
  let limiter: WebSocketRateLimiter;
  let mockWebSocket: any;

  beforeEach(() => {
    limiter = new WebSocketRateLimiter({
      windowMs: 1000,
      maxRequests: 3,
    });

    mockWebSocket = {
      on: jest.fn(),
    };
  });

  describe('checkWebSocketLimit', () => {
    it('should track WebSocket connections separately', () => {
      const ws1 = { ...mockWebSocket, id: 1 };
      const ws2 = { ...mockWebSocket, id: 2 };

      // Use up ws1's limit
      for (let i = 0; i < 3; i++) {
        limiter.checkWebSocketLimit(ws1);
      }

      expect(limiter.checkWebSocketLimit(ws1)).toBe(false);
      expect(limiter.checkWebSocketLimit(ws2)).toBe(true);
    });

    it('should assign unique IDs to WebSockets', () => {
      const ws1 = { ...mockWebSocket };
      const ws2 = { ...mockWebSocket };

      limiter.checkWebSocketLimit(ws1);
      limiter.checkWebSocketLimit(ws2);

      // Both should have their own limits
      expect(limiter.getWebSocketRemaining(ws1)).toBe(2);
      expect(limiter.getWebSocketRemaining(ws2)).toBe(2);
    });
  });

  describe('getWebSocketRemaining', () => {
    it('should return remaining requests for WebSocket', () => {
      const ws = { ...mockWebSocket };
      
      expect(limiter.getWebSocketRemaining(ws)).toBe(3);
      
      limiter.checkWebSocketLimit(ws);
      expect(limiter.getWebSocketRemaining(ws)).toBe(2);
    });
  });

  describe('getWebSocketTimeUntilReset', () => {
    it('should return time until reset for WebSocket', () => {
      const ws = { ...mockWebSocket };
      
      limiter.checkWebSocketLimit(ws);
      
      const timeUntilReset = limiter.getWebSocketTimeUntilReset(ws);
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(1000);
    });
  });
});
