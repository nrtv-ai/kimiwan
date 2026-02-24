import { Router } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, comments, NewComment } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../index.js';

const router = Router({ mergeParams: true });

// Validation schema
const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000, 'Comment too long'),
  parentId: z.string().uuid().optional(),
});

// Helper to broadcast comment events
const broadcastCommentEvent = (event: string, comment: any, projectId: string) => {
  if (projectId) {
    io.to(`project:${projectId}`).emit(`comment:${event}`, comment);
  }
};

// GET /api/v1/tasks/:taskId/comments - Get all comments for a task
router.get('/', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    const taskComments = await db.query.comments.findMany({
      where: (comments, { eq }) => eq(comments.taskId, taskId),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [desc(comments.createdAt)],
    });
    
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
    const task = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, taskId),
      columns: {
        id: true,
        projectId: true,
      },
    });
    
    if (!task) {
      throw new AppError(404, 'Task not found', 'NOT_FOUND');
    }
    
    const newComment: NewComment = {
      taskId,
      authorId,
      authorType: 'user',
      content: data.content,
      parentId: data.parentId || null,
    };
    
    const [comment] = await db.insert(comments).values(newComment).returning();
    
    // Fetch the complete comment with author info
    const commentWithAuthor = await db.query.comments.findFirst({
      where: (comments, { eq }) => eq(comments.id, comment.id),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    
    // Broadcast comment creation event
    broadcastCommentEvent('created', commentWithAuthor, task.projectId);
    
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
    const existingComment = await db.query.comments.findFirst({
      where: (comments, { eq }) => eq(comments.id, id),
    });
    
    if (!existingComment) {
      throw new AppError(404, 'Comment not found', 'NOT_FOUND');
    }
    
    if (existingComment.authorId !== authorId) {
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
    const task = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, taskId),
      columns: { projectId: true },
    });
    
    // Fetch complete comment with author
    const commentWithAuthor = await db.query.comments.findFirst({
      where: (comments, { eq }) => eq(comments.id, comment.id),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    
    broadcastCommentEvent('updated', commentWithAuthor, task?.projectId || '');
    
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
    const existingComment = await db.query.comments.findFirst({
      where: (comments, { eq }) => eq(comments.id, id),
    });
    
    if (!existingComment) {
      throw new AppError(404, 'Comment not found', 'NOT_FOUND');
    }
    
    // Only allow author or admin to delete
    if (existingComment.authorId !== authorId && req.user?.role !== 'admin') {
      throw new AppError(403, 'You can only delete your own comments', 'FORBIDDEN');
    }
    
    // Get task for broadcasting before deletion
    const task = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, taskId),
      columns: { projectId: true },
    });
    
    await db.delete(comments).where(eq(comments.id, id));
    
    broadcastCommentEvent('deleted', { id, taskId }, task?.projectId || '');
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as commentRoutes };
