import { Router } from 'express';
import { z } from 'zod';
import { db, projects, NewProject } from '../db/index.js';
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
    const allProjects = await db.query.projects.findMany({
      with: {
        team: true,
      },
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });
    
    res.json({ data: allProjects });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, req.params.id),
      with: {
        team: true,
      },
    });
    
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
    
    const [project] = await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
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
