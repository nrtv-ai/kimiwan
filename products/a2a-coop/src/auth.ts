/**
 * Authentication and authorization for A2A-Coop
 * 
 * Supports multiple auth strategies:
 * - API Key: Simple token-based auth for service-to-service
 * - JWT: Token-based with claims and expiration
 * - None: Development/testing mode (default)
 */

import { createHash, timingSafeEqual, randomBytes } from 'crypto';

/**
 * Authentication strategy type
 */
export type AuthStrategy = 'none' | 'apiKey' | 'jwt';

/**
 * Agent permissions
 */
export interface Permissions {
  read: boolean;
  write: boolean;
  admin: boolean;
}

/**
 * Authenticated agent info
 */
export interface AuthContext {
  agentId: string;
  permissions: Permissions;
  metadata: Record<string, unknown>;
  authenticatedAt: Date;
}

/**
 * API Key configuration
 */
export interface ApiKeyConfig {
  keys: Map<string, { agentId: string; permissions: Permissions }>;
}

/**
 * JWT configuration
 */
export interface JWTConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  expiresInSeconds?: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  strategy: AuthStrategy;
  apiKey?: ApiKeyConfig;
  jwt?: JWTConfig;
  /**
   * Allow unauthenticated access to health endpoint
   * @default true
   */
  allowHealthWithoutAuth?: boolean;
}

/**
 * Authentication error
 */
export class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Simple JWT implementation (no external dependencies)
 */
class SimpleJWT {
  constructor(private config: JWTConfig) {}

  sign(payload: Record<string, unknown>): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const exp = this.config.expiresInSeconds 
      ? now + this.config.expiresInSeconds 
      : now + 3600; // Default 1 hour

    const fullPayload = {
      ...payload,
      iat: now,
      exp,
      ...(this.config.issuer && { iss: this.config.issuer }),
      ...(this.config.audience && { aud: this.config.audience }),
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.signData(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verify(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AuthError('Invalid JWT format', 'INVALID_TOKEN');
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = this.signData(`${encodedHeader}.${encodedPayload}`);
    if (!this.timingSafeCompare(signature, expectedSignature)) {
      throw new AuthError('Invalid signature', 'INVALID_SIGNATURE');
    }

    // Parse payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(this.base64UrlDecode(encodedPayload));
    } catch {
      throw new AuthError('Invalid payload', 'INVALID_PAYLOAD');
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && typeof payload.exp === 'number' && payload.exp < now) {
      throw new AuthError('Token expired', 'TOKEN_EXPIRED');
    }

    // Verify issuer
    if (this.config.issuer && payload.iss !== this.config.issuer) {
      throw new AuthError('Invalid issuer', 'INVALID_ISSUER');
    }

    // Verify audience
    if (this.config.audience && payload.aud !== this.config.audience) {
      throw new AuthError('Invalid audience', 'INVALID_AUDIENCE');
    }

    return payload;
  }

  private signData(data: string): string {
    const hmac = createHash('sha256');
    hmac.update(data + this.config.secret);
    return this.base64UrlEncode(hmac.digest());
  }

  private base64UrlEncode(str: string | Buffer): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlDecode(str: string): string {
    // Add padding
    const padding = 4 - (str.length % 4);
    if (padding !== 4) {
      str += '='.repeat(padding);
    }
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  }

  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return timingSafeEqual(bufA, bufB);
  }
}

/**
 * Authentication manager for A2A-Coop
 */
export class AuthManager {
  private config: AuthConfig;
  private jwt?: SimpleJWT;

  constructor(config: AuthConfig) {
    this.config = config;
    
    if (config.strategy === 'jwt' && config.jwt) {
      this.jwt = new SimpleJWT(config.jwt);
    }
  }

  /**
   * Authenticate a request
   * @param authHeader Authorization header value (e.g., "Bearer token" or "ApiKey key")
   * @returns AuthContext if authenticated
   * @throws AuthError if authentication fails
   */
  authenticate(authHeader?: string): AuthContext {
    // No auth required
    if (this.config.strategy === 'none') {
      return {
        agentId: 'anonymous',
        permissions: { read: true, write: true, admin: true },
        metadata: {},
        authenticatedAt: new Date(),
      };
    }

    if (!authHeader) {
      throw new AuthError('Authorization header required', 'AUTH_REQUIRED');
    }

    // Parse auth header
    const [scheme, token] = authHeader.split(' ');
    if (!scheme || !token) {
      throw new AuthError('Invalid authorization header format', 'INVALID_FORMAT');
    }

    switch (this.config.strategy) {
      case 'apiKey':
        return this.authenticateApiKey(token);
      case 'jwt':
        return this.authenticateJWT(token);
      default:
        throw new AuthError('Unknown auth strategy', 'UNKNOWN_STRATEGY');
    }
  }

  /**
   * Authenticate using API key
   */
  private authenticateApiKey(key: string): AuthContext {
    if (!this.config.apiKey) {
      throw new AuthError('API key auth not configured', 'NOT_CONFIGURED');
    }

    const keyData = this.config.apiKey.keys.get(key);
    if (!keyData) {
      throw new AuthError('Invalid API key', 'INVALID_KEY');
    }

    return {
      agentId: keyData.agentId,
      permissions: keyData.permissions,
      metadata: { authMethod: 'apiKey' },
      authenticatedAt: new Date(),
    };
  }

  /**
   * Authenticate using JWT
   */
  private authenticateJWT(token: string): AuthContext {
    if (!this.jwt) {
      throw new AuthError('JWT auth not configured', 'NOT_CONFIGURED');
    }

    const payload = this.jwt.verify(token);

    return {
      agentId: (payload.sub as string) || 'unknown',
      permissions: (payload.permissions as Permissions) || { read: true, write: false, admin: false },
      metadata: { 
        authMethod: 'jwt',
        claims: payload,
      },
      authenticatedAt: new Date(),
    };
  }

  /**
   * Generate a JWT token (for JWT strategy)
   */
  generateToken(payload: Record<string, unknown>): string {
    if (!this.jwt) {
      throw new AuthError('JWT auth not configured', 'NOT_CONFIGURED');
    }
    return this.jwt.sign(payload);
  }

  /**
   * Check if a path can be accessed without authentication
   */
  canAccessWithoutAuth(path: string): boolean {
    if (this.config.allowHealthWithoutAuth !== false && path === '/health') {
      return true;
    }
    return false;
  }

  /**
   * Check if context has required permission
   */
  checkPermission(context: AuthContext, permission: keyof Permissions): void {
    if (!context.permissions[permission]) {
      throw new AuthError(`Permission denied: ${permission} required`, 'PERMISSION_DENIED');
    }
  }
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): string {
  return `a2a_${randomBytes(32).toString('hex')}`;
}

/**
 * Generate a secure JWT secret
 */
export function generateJWTSecret(): string {
  return randomBytes(64).toString('hex');
}

/**
 * Create auth config from environment variables
 */
export function createAuthConfigFromEnv(): AuthConfig {
  const strategy = (process.env.A2A_AUTH_STRATEGY as AuthStrategy) || 'none';
  
  switch (strategy) {
    case 'apiKey': {
      // Parse API keys from env: A2A_API_KEYS=key1:agent1:read,write,key2:agent2:admin
      const keysConfig = process.env.A2A_API_KEYS || '';
      const keys = new Map();
      
      if (keysConfig) {
        for (const entry of keysConfig.split(',')) {
          const [key, agentId, perms] = entry.split(':');
          if (key && agentId) {
            const permissions: Permissions = {
              read: perms?.includes('read') || perms?.includes('admin') || false,
              write: perms?.includes('write') || perms?.includes('admin') || false,
              admin: perms?.includes('admin') || false,
            };
            keys.set(key, { agentId, permissions });
          }
        }
      }

      return {
        strategy: 'apiKey',
        apiKey: { keys },
        allowHealthWithoutAuth: process.env.A2A_AUTH_ALLOW_HEALTH !== 'false',
      };
    }

    case 'jwt': {
      return {
        strategy: 'jwt',
        jwt: {
          secret: process.env.A2A_JWT_SECRET || generateJWTSecret(),
          issuer: process.env.A2A_JWT_ISSUER,
          audience: process.env.A2A_JWT_AUDIENCE,
          expiresInSeconds: process.env.A2A_JWT_EXPIRES_IN 
            ? parseInt(process.env.A2A_JWT_EXPIRES_IN, 10) 
            : 3600,
        },
        allowHealthWithoutAuth: process.env.A2A_AUTH_ALLOW_HEALTH !== 'false',
      };
    }

    default:
      return { strategy: 'none' };
  }
}
