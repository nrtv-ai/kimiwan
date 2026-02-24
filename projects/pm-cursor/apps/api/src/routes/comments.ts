import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db, comments, users, tasks } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../index.js';

const router = Router({ mergeParams: true });

// Validation schema
const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000, 'Comment too long'),
  parentId: z.string().uuid().optional(),
});

// Helper to broadcast comment events
const broadcastCommentEvent = (event: string, comment: Record<string, any>, projectId: string) => {
  if (projectId) {
    io.to(`project:${projectId}`).emit(`comment:${event}`, comment);
  }
};

// GET /api/v1/tasks/:taskId/comments - Get all comments for a task
router.get('/', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    const result = await db
      .select({
        comment: comments,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.taskId, taskId))
      .orderBy(desc(comments.createdAt));
    
    const taskComments = result.map(r => ({
      ...(r.comment as Record<string, any>),
      author: r.author,
    }));
    
    res.json({ data: taskComments });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tasks/:taskId/comments - Create a comment
router.post('/', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const data = createCommentSchema.parse(req.body);
    
    // Get authorId from authenticated user
    const authorId = req.user?.id;
    if (!authorId) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }
    
    // Get task to find projectId for broadcasting
    const taskResult = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!taskResult.length) {
      throw new AppError(404, 'Task not found', 'NOT_FOUND');
    }
    
    const projectId = taskResult[0].projectId;
    
    const newComment = {
      taskId,
      authorId,
      authorType: 'user',
      content: data.content,
      parentId: data.parentId || null,
    };
    
    const [comment] = await db.insert(comments).values(newComment).returning();
    
    // Fetch author info
    const author = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);
    
    const commentWithAuthor = {
      ...comment,
      author: author[0] || null,
    };
    
    // Broadcast comment creation event
    broadcastCommentEvent('created', commentWithAuthor as any, projectId);
    
    res.status(201).json({ data: commentWithAuthor });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/tasks/:taskId/comments/:id - Update a comment
router.patch('/:id', async (req, res, next) => {
  try {
    const { taskId, id } = req.params;
    const updateSchema = z.object({
      content: z.string().min(1).max(5000).optional(),
    });
    const data = updateSchema.parse(req.body);
    
    const authorId = req.user?.id;
    if (!authorId) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }
    
    // Check if comment exists and belongs to user
    const existingComment = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.taskId, taskId)))
      .limit(1);
    
    if (!existingComment.length) {
      throw new AppError(404, 'Comment not found', 'NOT_FOUND');
    }
    
    if ((existingComment[0] as Record<string, any>).authorId !== authorId) {
      throw new AppError(403, 'You can only edit your own comments', 'FORBIDDEN');
    }
    
    const [comment] = await db
      .update(comments)
      .set({
        content: data.content,
        editedAt: new Date(),
      })
      .where(eq(comments.id, id))
      .returning();
    
    // Get task for broadcasting
    const taskResult = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    // Fetch author info
    const author = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);
    
    const commentWithAuthor = {
      ...comment,
      author: author[0] || null,
    };
    
    broadcastCommentEvent('updated', commentWithAuthor as any, taskResult[0]?.projectId || '');
    
    res.json({ data: commentWithAuthor });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/tasks/:taskId/comments/:id - Delete a comment
router.delete('/:id', async (req, res, next) => {
  try {
    const { taskId, id } = req.params;
    
    const authorId = req.user?.id;
    if (!authorId) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }
    
    // Check if comment exists
    const existingComment = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.taskId, taskId)))
      .limit(1);
    
    if (!existingComment.length) {
      throw new AppError(404, 'Comment not found', 'NOT_FOUND');
    }
    
    // Only allow author or admin to delete
    if ((existingComment[0] as Record<string, any>).authorId !== authorId && req.user?.role !== 'admin') {
      throw new AppError(403, 'You can only delete your own comments', 'FORBIDDEN');
    }
    
    // Get task for broadcasting before deletion
    const taskResult = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    await db.delete(comments).where(eq(comments.id, id));
    
    broadcastCommentEvent('deleted', { id, taskId } as any, taskResult[0]?.projectId || '');
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as commentRoutes };
