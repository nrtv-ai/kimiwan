"use strict";
/**
 * Authentication and authorization for A2A-Coop
 *
 * Supports multiple auth strategies:
 * - API Key: Simple token-based auth for service-to-service
 * - JWT: Token-based with claims and expiration
 * - None: Development/testing mode (default)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = exports.AuthError = void 0;
exports.generateApiKey = generateApiKey;
exports.generateJWTSecret = generateJWTSecret;
exports.createAuthConfigFromEnv = createAuthConfigFromEnv;
const crypto_1 = require("crypto");
/**
 * Authentication error
 */
class AuthError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
/**
 * Simple JWT implementation (no external dependencies)
 */
class SimpleJWT {
    config;
    constructor(config) {
        this.config = config;
    }
    sign(payload) {
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
    verify(token) {
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
        let payload;
        try {
            payload = JSON.parse(this.base64UrlDecode(encodedPayload));
        }
        catch {
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
    signData(data) {
        const hmac = (0, crypto_1.createHash)('sha256');
        hmac.update(data + this.config.secret);
        return this.base64UrlEncode(hmac.digest());
    }
    base64UrlEncode(str) {
        return Buffer.from(str)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    base64UrlDecode(str) {
        // Add padding
        const padding = 4 - (str.length % 4);
        if (padding !== 4) {
            str += '='.repeat(padding);
        }
        return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    }
    timingSafeCompare(a, b) {
        if (a.length !== b.length)
            return false;
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        return (0, crypto_1.timingSafeEqual)(bufA, bufB);
    }
}
/**
 * Authentication manager for A2A-Coop
 */
class AuthManager {
    config;
    jwt;
    constructor(config) {
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
    authenticate(authHeader) {
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
    authenticateApiKey(key) {
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
    authenticateJWT(token) {
        if (!this.jwt) {
            throw new AuthError('JWT auth not configured', 'NOT_CONFIGURED');
        }
        const payload = this.jwt.verify(token);
        return {
            agentId: payload.sub || 'unknown',
            permissions: payload.permissions || { read: true, write: false, admin: false },
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
    generateToken(payload) {
        if (!this.jwt) {
            throw new AuthError('JWT auth not configured', 'NOT_CONFIGURED');
        }
        return this.jwt.sign(payload);
    }
    /**
     * Check if a path can be accessed without authentication
     */
    canAccessWithoutAuth(path) {
        if (this.config.allowHealthWithoutAuth !== false && path === '/health') {
            return true;
        }
        return false;
    }
    /**
     * Check if context has required permission
     */
    checkPermission(context, permission) {
        if (!context.permissions[permission]) {
            throw new AuthError(`Permission denied: ${permission} required`, 'PERMISSION_DENIED');
        }
    }
}
exports.AuthManager = AuthManager;
/**
 * Generate a secure random API key
 */
function generateApiKey() {
    return `a2a_${(0, crypto_1.randomBytes)(32).toString('hex')}`;
}
/**
 * Generate a secure JWT secret
 */
function generateJWTSecret() {
    return (0, crypto_1.randomBytes)(64).toString('hex');
}
/**
 * Create auth config from environment variables
 */
function createAuthConfigFromEnv() {
    const strategy = process.env.A2A_AUTH_STRATEGY || 'none';
    switch (strategy) {
        case 'apiKey': {
            // Parse API keys from env: A2A_API_KEYS=key1:agent1:read,write,key2:agent2:admin
            const keysConfig = process.env.A2A_API_KEYS || '';
            const keys = new Map();
            if (keysConfig) {
                for (const entry of keysConfig.split(',')) {
                    const [key, agentId, perms] = entry.split(':');
                    if (key && agentId) {
                        const permissions = {
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
//# sourceMappingURL=auth.js.map