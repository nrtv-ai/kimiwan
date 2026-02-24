import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, attachments } from '../db/index.js';
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
const broadcastAttachmentEvent = (event: string, attachment: any, taskId: string) => {
  io.to(`task:${taskId}`).emit(`attachment:${event}`, attachment);
  io.emit(`attachment:${event}`, { ...attachment, taskId });
};

// GET /api/v1/tasks/:taskId/attachments - List all attachments for a task
router.get('/', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    const taskAttachments = await db.query.attachments.findMany({
      where: (attachments, { eq }) => eq(attachments.taskId, taskId),
      with: {
        uploadedByUser: true,
      },
      orderBy: (attachments, { desc }) => [desc(attachments.createdAt)],
    });
    
    res.json({ data: taskAttachments });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/tasks/:taskId/attachments - Upload a new attachment
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const { taskId } = req.params;
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
    
    // Populate uploadedBy user info for the response
    const attachmentWithUser = await db.query.attachments.findFirst({
      where: (attachments, { eq }) => eq(attachments.id, attachment.id),
      with: {
        uploadedByUser: true,
      },
    });
    
    // Broadcast attachment creation event
    broadcastAttachmentEvent('created', attachmentWithUser, taskId);
    
    res.status(201).json({ data: attachmentWithUser });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/tasks/:taskId/attachments/:id - Get a specific attachment
router.get('/:id', async (req, res, next) => {
  try {
    const { taskId, id } = req.params;
    
    const attachment = await db.query.attachments.findFirst({
      where: (attachments, { eq, and }) => 
        and(eq(attachments.id, id), eq(attachments.taskId, taskId)),
      with: {
        uploadedByUser: true,
      },
    });
    
    if (!attachment) {
      throw new AppError(404, 'Attachment not found', 'NOT_FOUND');
    }
    
    res.json({ data: attachment });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/tasks/:taskId/attachments/:id - Delete an attachment
router.delete('/:id', async (req, res, next) => {
  try {
    const { taskId, id } = req.params;
    const userId = req.user?.id;
    
    // Get attachment to check ownership
    const attachment = await db.query.attachments.findFirst({
      where: (attachments, { eq, and }) => 
        and(eq(attachments.id, id), eq(attachments.taskId, taskId)),
    });
    
    if (!attachment) {
      throw new AppError(404, 'Attachment not found', 'NOT_FOUND');
    }
    
    // Check if user is the uploader or an admin
    if (attachment.uploadedBy !== userId && req.user?.role !== 'admin') {
      throw new AppError(403, 'You can only delete your own attachments', 'FORBIDDEN');
    }
    
    await db.delete(attachments).where(eq(attachments.id, id));
    
    // Broadcast attachment deletion event
    broadcastAttachmentEvent('deleted', { id, taskId }, taskId);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as attachmentRoutes };
