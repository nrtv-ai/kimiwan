import { Router } from 'express';
import { z } from 'zod';
import { db, users, teams, teamMembers, NewUser } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler.js';
import { 
  authenticate, 
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

function slugifyWorkspace(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'workspace';
}

async function buildUniqueWorkspaceSlug(name: string): Promise<string> {
  const base = slugifyWorkspace(name);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await db.query.teams.findFirst({
      where: eq(teams.slug, candidate),
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function ensureDefaultWorkspace(userId: string, userName: string): Promise<string> {
  const existingMembership = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .orderBy(asc(teamMembers.joinedAt))
    .limit(1);

  if (existingMembership.length > 0) {
    return existingMembership[0].teamId;
  }

  const workspaceName = `${userName}'s Workspace`;
  const slug = await buildUniqueWorkspaceSlug(workspaceName);

  const [team] = await db
    .insert(teams)
    .values({
      name: workspaceName,
      slug,
      description: 'Personal workspace',
      settings: { singleUserMode: true, aiFirst: true },
    })
    .returning();

  await db.insert(teamMembers).values({
    userId,
    teamId: team.id,
    role: 'owner',
  });

  return team.id;
}

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
    const defaultTeamId = await ensureDefaultWorkspace(user.id, user.name);

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
          defaultTeamId,
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
    const defaultTeamId = await ensureDefaultWorkspace(user.id, user.name);

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
          defaultTeamId,
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
    const defaultTeamId = await ensureDefaultWorkspace(user.id, user.name);
    const memberships = await db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
        name: teams.name,
        slug: teams.slug,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, user.id))
      .orderBy(asc(teamMembers.joinedAt));

    res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences,
        defaultTeamId,
        teams: memberships,
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
