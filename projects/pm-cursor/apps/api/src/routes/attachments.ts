import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { db, attachments, users } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../index.js';

const router = Router({ mergeParams: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Helper to broadcast attachment events
const broadcastAttachmentEvent = (event: string, attachment: Record<string, any>, taskId: string) => {
  io.to(`task:${taskId}`).emit(`attachment:${event}`, attachment);
  io.emit(`attachment:${event}`, { ...attachment, taskId });
};

// GET /api/v1/tasks/:taskId/attachments - List all attachments for a task
router.get('/', async (req, res, next) => {
  try {
    const { taskId } = req.params as { taskId: string };
    
    // Get attachments with user info using a join
    const result = await db
      .select({
        attachment: attachments,
        uploadedByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(attachments)
      .leftJoin(users, eq(attachments.uploadedBy, users.id))
      .where(eq(attachments.taskId, taskId))
      .orderBy(attachments.createdAt);
    
    // Transform to expected format
    const taskAttachments = result.map(r => ({
      ...(r.attachment as Record<string, any>),
      uploadedByUser: r.uploadedByUser,
    }));
    
    res.json({ data: taskAttachments });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tasks/:taskId/attachments - Upload a new attachment
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const { taskId } = req.params as { taskId: string };
    const file = req.file;
    
    if (!file) {
      throw new AppError(400, 'No file uploaded', 'NO_FILE');
    }
    
    const uploadedBy = req.user?.id || '00000000-0000-0000-0000-000000000000';
    
    const newAttachment = {
      taskId,
      uploadedBy,
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        encoding: file.encoding,
      },
    };
    
    const [attachment] = await db.insert(attachments).values(newAttachment).returning();
    
    // Get user info
    const user = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.id, uploadedBy)).limit(1);
    
    const attachmentWithUser = {
      ...attachment,
      uploadedByUser: user[0] || null,
    };
    
    // Broadcast attachment creation event
    broadcastAttachmentEvent('created', attachmentWithUser as any, taskId);
    
    res.status(201).json({ data: attachmentWithUser });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/tasks/:taskId/attachments/:id - Get a specific attachment
router.get('/:id', async (req, res, next) => {
  try {
    const { taskId, id } = req.params as { taskId: string; id: string };
    
    const result = await db
      .select({
        attachment: attachments,
        uploadedByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(attachments)
      .leftJoin(users, eq(attachments.uploadedBy, users.id))
      .where(and(eq(attachments.id, id), eq(attachments.taskId, taskId)))
      .limit(1);
    
    if (!result.length) {
      throw new AppError(404, 'Attachment not found', 'NOT_FOUND');
    }
    
    res.json({ data: { ...(result[0].attachment as Record<string, any>), uploadedByUser: result[0].uploadedByUser } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/tasks/:taskId/attachments/:id - Delete an attachment
router.delete('/:id', async (req, res, next) => {
  try {
    const { taskId, id } = req.params as { taskId: string; id: string };
    const userId = req.user?.id;
    
    // Get attachment to check ownership
    const attachment = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.taskId, taskId)))
      .limit(1);
    
    if (!attachment.length) {
      throw new AppError(404, 'Attachment not found', 'NOT_FOUND');
    }
    
    // Check if user is the uploader or an admin
    if ((attachment[0] as Record<string, any>).uploadedBy !== userId && req.user?.role !== 'admin') {
      throw new AppError(403, 'You can only delete your own attachments', 'FORBIDDEN');
    }
    
    await db.delete(attachments).where(eq(attachments.id, id));
    
    // Broadcast attachment deletion event
    broadcastAttachmentEvent('deleted', { id, taskId } as any, taskId);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as attachmentRoutes };
