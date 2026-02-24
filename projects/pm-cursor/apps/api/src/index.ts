import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { projectRoutes } from './routes/projects.js';
import { taskRoutes } from './routes/tasks.js';
import { agentRoutes } from './routes/agents.js';
import { userRoutes } from './routes/users.js';
import { activityRoutes } from './routes/activities.js';
import { authRoutes } from './routes/auth.js';
import { commentRoutes } from './routes/comments.js';
import { authenticate } from './lib/auth.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/v1/auth', authRoutes);

// Protected API routes
app.use('/api/v1/projects', authenticate, projectRoutes);
app.use('/api/v1/tasks', authenticate, taskRoutes);
app.use('/api/v1/agents', authenticate, agentRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/activities', authenticate, activityRoutes);
app.use('/api/v1/tasks/:taskId/comments', authenticate, commentRoutes);

// Error handling
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in other modules
export { io };

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
});
