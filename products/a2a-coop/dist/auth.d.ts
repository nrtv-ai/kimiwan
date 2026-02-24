/**
 * Authentication and authorization for A2A-Coop
 *
 * Supports multiple auth strategies:
 * - API Key: Simple token-based auth for service-to-service
 * - JWT: Token-based with claims and expiration
 * - None: Development/testing mode (default)
 */
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
    keys: Map<string, {
        agentId: string;
        permissions: Permissions;
    }>;
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
export declare class AuthError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Authentication manager for A2A-Coop
 */
export declare class AuthManager {
    private config;
    private jwt?;
    constructor(config: AuthConfig);
    /**
     * Authenticate a request
     * @param authHeader Authorization header value (e.g., "Bearer token" or "ApiKey key")
     * @returns AuthContext if authenticated
     * @throws AuthError if authentication fails
     */
    authenticate(authHeader?: string): AuthContext;
    /**
     * Authenticate using API key
     */
    private authenticateApiKey;
    /**
     * Authenticate using JWT
     */
    private authenticateJWT;
    /**
     * Generate a JWT token (for JWT strategy)
     */
    generateToken(payload: Record<string, unknown>): string;
    /**
     * Check if a path can be accessed without authentication
     */
    canAccessWithoutAuth(path: string): boolean;
    /**
     * Check if context has required permission
     */
    checkPermission(context: AuthContext, permission: keyof Permissions): void;
}
/**
 * Generate a secure random API key
 */
export declare function generateApiKey(): string;
/**
 * Generate a secure JWT secret
 */
export declare function generateJWTSecret(): string;
/**
 * Create auth config from environment variables
 */
export declare function createAuthConfigFromEnv(): AuthConfig;
//# sourceMappingURL=auth.d.ts.map