import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TaskEvent {
  id: string;
  projectId: string;
  [key: string]: any;
}

type TaskEventHandler = (task: TaskEvent) => void;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-project', projectId);
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-project', projectId);
    }
  }, []);

  const onTaskCreated = useCallback((handler: TaskEventHandler) => {
    if (socketRef.current) {
      socketRef.current.on('task:created', handler);
      return () => {
        socketRef.current?.off('task:created', handler);
      };
    }
    return () => {};
  }, []);

  const onTaskUpdated = useCallback((handler: TaskEventHandler) => {
    if (socketRef.current) {
      socketRef.current.on('task:updated', handler);
      return () => {
        socketRef.current?.off('task:updated', handler);
      };
    }
    return () => {};
  }, []);

  const onTaskDeleted = useCallback((handler: TaskEventHandler) => {
    if (socketRef.current) {
      socketRef.current.on('task:deleted', handler);
      return () => {
        socketRef.current?.off('task:deleted', handler);
      };
    }
    return () => {};
  }, []);

  return {
    socket: socketRef.current,
    joinProject,
    leaveProject,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
  };
}
