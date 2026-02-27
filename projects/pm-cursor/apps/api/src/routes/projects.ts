import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, projects, teams, NewProject } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createProjectSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('private'),
  startDate: z.string().datetime().optional(),
  targetDate: z.string().datetime().optional(),
});

// GET /api/v1/projects
router.get('/', async (_req, res, next) => {
  try {
    const result = await db
      .select({
        project: projects,
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        },
      })
      .from(projects)
      .leftJoin(teams, eq(projects.teamId, teams.id))
      .orderBy(projects.createdAt);

    const allProjects = result.map((row) => ({
      ...row.project,
      team: row.team,
    }));
    
    res.json({ data: allProjects });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db
      .select({
        project: projects,
        team: {
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        },
      })
      .from(projects)
      .leftJoin(teams, eq(projects.teamId, teams.id))
      .where(eq(projects.id, req.params.id))
      .limit(1);

    const project = result[0]
      ? {
          ...result[0].project,
          team: result[0].team,
        }
      : null;
    
    if (!project) {
      throw new AppError(404, 'Project not found', 'NOT_FOUND');
    }
    
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/projects
router.post('/', async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);
    
    const newProject: NewProject = {
      teamId: data.teamId,
      name: data.name,
      description: data.description,
      visibility: data.visibility,
      startDate: data.startDate ? new Date(data.startDate) : null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
    };
    
    const [project] = await db.insert(projects).values(newProject).returning();
    
    res.status(201).json({ data: project });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/projects/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const updateSchema = createProjectSchema.partial();
    const data = updateSchema.parse(req.body);
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null;
    
    const [project] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, req.params.id))
      .returning();
    
    if (!project) {
      throw new AppError(404, 'Project not found', 'NOT_FOUND');
    }
    
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/projects/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [project] = await db
      .delete(projects)
      .where(eq(projects.id, req.params.id))
      .returning();
    
    if (!project) {
      throw new AppError(404, 'Project not found', 'NOT_FOUND');
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as projectRoutes };
