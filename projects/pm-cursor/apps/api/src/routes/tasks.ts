import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, tasks, NewTask } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().int().positive().optional(),
  labels: z.array(z.string()).default([]),
});

// GET /api/v1/tasks
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    
    const query = db.query.tasks.findMany({
      with: {
        assignee: true,
        creator: true,
      },
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
    });
    
    const allTasks = await query;
    
    // Filter by project if specified
    const filteredTasks = projectId 
      ? allTasks.filter(t => t.projectId === projectId)
      : allTasks;
    
    res.json({ data: filteredTasks });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const task = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, req.params.id),
      with: {
        assignee: true,
        creator: true,
        comments: true,
        attachments: true,
      },
    });
    
    if (!task) {
      throw new AppError(404, 'Task not found', 'NOT_FOUND');
    }
    
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tasks
router.post('/', async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    
    // Get creatorId from authenticated user
    const creatorId = req.user?.id || '00000000-0000-0000-0000-000000000000';
    
    const newTask: NewTask = {
      projectId: data.projectId,
      parentId: data.parentId || null,
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId || null,
      creatorId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      estimatedHours: data.estimatedHours || null,
      labels: data.labels,
    };
    
    const result = await db.insert(tasks).values(newTask).returning();
    const task = result[0];
    
    res.status(201).json({ data: task });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/tasks/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const updateSchema = createTaskSchema.partial();
    const data = updateSchema.parse(req.body);
    
    const updateData: Partial<NewTask> = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      updatedAt: new Date(),
    };
    
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, req.params.id))
      .returning();
    
    if (!task) {
      throw new AppError(404, 'Task not found', 'NOT_FOUND');
    }
    
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [task] = await db
      .delete(tasks)
      .where(eq(tasks.id, req.params.id))
      .returning();
    
    if (!task) {
      throw new AppError(404, 'Task not found', 'NOT_FOUND');
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as taskRoutes };
