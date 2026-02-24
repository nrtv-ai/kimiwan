import { Router } from 'express';
import { z } from 'zod';
import { db, users, NewUser } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import { 
  authenticate, 
  registerUser, 
  loginUser, 
  hashPassword,
  generateTokens,
  comparePassword
} from '../lib/auth.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/v1/auth/register - Register a new user
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existingUser) {
      throw new AppError(409, 'User with this email already exists', 'CONFLICT');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user with password hash stored in preferences (temporary until we add password column)
    const newUser: NewUser = {
      email: data.email,
      name: data.name,
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

    res.status(201).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login - Login user
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
    }

    // Verify password
    const passwordHash = (user.preferences as any)?.passwordHash;
    if (!passwordHash) {
      throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
    }

    const isValid = await comparePassword(data.password, passwordHash);
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

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/me - Get current user (protected)
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id),
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'Refresh token required', 'BAD_REQUEST');
    }

    // Verify refresh token (simplified - in production use a separate secret or database)
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      throw new AppError(401, 'Invalid refresh token', 'UNAUTHORIZED');
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user) {
      throw new AppError(401, 'User not found', 'UNAUTHORIZED');
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.json({ data: { tokens } });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };
