import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { db, users, NewUser } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Type assertion for expiresIn
const signOptions: jwt.SignOptions = {
  expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  issuer: 'pm-cursor',
  audience: 'pm-cursor-client',
};
const SALT_ROUNDS = 12;

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT tokens for a user
 */
export function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, signOptions);

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'pm-cursor',
      audience: 'pm-cursor-client',
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token', 'UNAUTHORIZED');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Middleware to authenticate requests
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const payload = verifyToken(token);
    
    // Verify user still exists in database
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      throw new AppError(401, 'User not found', 'UNAUTHORIZED');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to optionally authenticate (for public endpoints that can be enhanced with auth)
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req);
    
    if (token) {
      const payload = verifyToken(token);
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
}

/**
 * Middleware to require specific roles
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions', 'FORBIDDEN'));
    }

    next();
  };
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: typeof users.$inferSelect; tokens: AuthTokens }> {
  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    throw new AppError(409, 'User with this email already exists', 'CONFLICT');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const newUser: NewUser = {
    email,
    name,
    // Store password hash in a separate field (we'll add this to schema)
    // For now, we'll store it in preferences as a workaround
    preferences: { passwordHash },
  };

  const [user] = await db.insert(users).values(newUser).returning();

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return { user, tokens };
}

/**
 * Login a user
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: typeof users.$inferSelect; tokens: AuthTokens }> {
  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
  }

  // Verify password (stored in preferences for now)
  const passwordHash = (user.preferences as any)?.passwordHash;
  if (!passwordHash) {
    throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
  }

  const isValid = await comparePassword(password, passwordHash);
  if (!isValid) {
    throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return { user, tokens };
}
