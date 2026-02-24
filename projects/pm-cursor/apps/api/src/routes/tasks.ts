import { Router } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, tasks, users, comments, attachments } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../index.js';

const router = Router();

// Helper to broadcast task events to project subscribers
const broadcastTaskEvent = (event: string, task: any) => {
  if (task.projectId) {
    io.to(`project:${task.projectId}`).emit(`task:${event}`, task);
  }
  // Also broadcast to global tasks channel
  io.emit(`task:${event}`, task);
};

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
    
    const result = await db
      .select({
        task: tasks,
        assignee: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .orderBy(desc(tasks.createdAt));
    
    const allTasks = result.map(r => ({
      ...r.task,
      assignee: r.assignee,
    }));
    
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
    // Get task with assignee and creator
    const taskResult = await db
      .select({
        task: tasks,
        assignee: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.id, req.params.id))
      .limit(1);
    
    if (!taskResult.length) {
      throw new AppError(404, 'Task not found', 'NOT_FOUND');
    }
    
    // Get creator info
    const creator = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, taskResult[0].task.creatorId))
      .limit(1);
    
    // Get comments count
    const commentsCount = await db
      .select({ count: comments.id })
      .from(comments)
      .where(eq(comments.taskId, req.params.id));
    
    // Get attachments count
    const attachmentsCount = await db
      .select({ count: attachments.id })
      .from(attachments)
      .where(eq(attachments.taskId, req.params.id));
    
    const task = {
      ...taskResult[0].task,
      assignee: taskResult[0].assignee,
      creator: creator[0] || null,
      commentsCount: commentsCount.length,
      attachmentsCount: attachmentsCount.length,
    };
    
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
    
    const newTask = {
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
    
    // Broadcast task creation event
    broadcastTaskEvent('created', task);
    
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
    
    const updateData: any = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      updatedAt: new Date(),
    };
    
    const result = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, req.params.id))
      .returning();
    
    const task = result[0];
    
    if (!task) {
      throw new AppError(404, 'Task not found', 'NOT_FOUND');
    }
    
    // Broadcast task update event
    broadcastTaskEvent('updated', task);
    
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    // Get task before deletion to broadcast event
    const taskToDelete = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.id))
      .limit(1);
    
    const result = await db
      .delete(tasks)
      .where(eq(tasks.id, req.params.id))
      .returning();
    
    const task = result[0];
    
    if (!task) {
      throw new AppError(404, 'Task not found', 'NOT_FOUND');
    }
    
    // Broadcast task deletion event
    broadcastTaskEvent('deleted', { ...task, id: req.params.id });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as taskRoutes };
