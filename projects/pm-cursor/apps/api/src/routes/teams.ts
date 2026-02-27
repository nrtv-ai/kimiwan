import { Router } from 'express';
import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';
import { db, teams, teamMembers } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100).optional(),
});

function slugifyWorkspace(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'workspace';
}

async function buildUniqueTeamSlug(name: string, preferredSlug?: string): Promise<string> {
  const base = preferredSlug ? slugifyWorkspace(preferredSlug) : slugifyWorkspace(name);
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

// GET /api/v1/teams - teams visible to current user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        description: teams.description,
        avatarUrl: teams.avatarUrl,
        settings: teams.settings,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId))
      .orderBy(asc(teamMembers.joinedAt));

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/teams/:id - team details if member
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const membership = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        description: teams.description,
        avatarUrl: teams.avatarUrl,
        settings: teams.settings,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, userId), eq(teams.id, req.params.id)))
      .limit(1);

    if (!membership.length) {
      throw new AppError(404, 'Team not found', 'NOT_FOUND');
    }

    res.json({ data: membership[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/teams - create a team and assign current user as owner
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }

    const data = createTeamSchema.parse(req.body);
    const slug = await buildUniqueTeamSlug(data.name, data.slug);

    const [team] = await db
      .insert(teams)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        settings: { singleUserMode: true, aiFirst: true },
      })
      .returning();

    await db.insert(teamMembers).values({
      userId,
      teamId: team.id,
      role: 'owner',
    });

    res.status(201).json({ data: { ...team, role: 'owner' } });
  } catch (error) {
    next(error);
  }
});

export { router as teamRoutes };
