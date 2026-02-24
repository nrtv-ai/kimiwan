import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, users, NewUser } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['admin', 'user']).default('user'),
});

// GET /api/v1/users
router.get('/', async (_req, res, next) => {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
    
    res.json({ data: allUsers });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.params.id),
    });
    
    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }
    
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/users
router.post('/', async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    
    const newUser: NewUser = {
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl || null,
      role: data.role,
      preferences: {
        theme: 'system',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        emailNotifications: true,
        pushNotifications: true,
      },
    };
    
    const [user] = await db.insert(users).values(newUser).returning();
    
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/users/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const updateSchema = createUserSchema.partial();
    const data = updateSchema.parse(req.body);
    
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.params.id))
      .returning();
    
    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }
    
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [user] = await db
      .delete(users)
      .where(eq(users.id, req.params.id))
      .returning();
    
    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as userRoutes };
