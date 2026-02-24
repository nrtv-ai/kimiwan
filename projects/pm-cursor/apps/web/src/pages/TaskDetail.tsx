import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  User,
  AlertCircle,
  Clock,
  MessageSquare,
  Paperclip,
  MoreVertical,
  Edit2,
  Trash2,
  Send,
  CheckCircle2,
  Circle,
  Clock4,
  AlertTriangle,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  estimatedHours: number | null;
  projectId: string;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

const statusOptions = [
  { value: 'backlog', label: 'Backlog', icon: Circle, color: 'text-gray-500' },
  { value: 'todo', label: 'To Do', icon: Circle, color: 'text-blue-500' },
  { value: 'in_progress', label: 'In Progress', icon: Clock4, color: 'text-yellow-500' },
  { value: 'in_review', label: 'In Review', icon: AlertCircle, color: 'text-purple-500' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'cancelled', label: 'Cancelled', icon: X, color: 'text-red-500' },
] as const;

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
] as const;

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { joinProject, leaveProject, onTaskUpdated, onTaskDeleted } = useSocket();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editForm, setEditForm] = useState<Partial<Task>>({});

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async (): Promise<Task> => {
      const res = await api.get(`/tasks/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ['task-comments', id],
    queryFn: async (): Promise<Comment[]> => {
      // TODO: Implement comments API
      return [];
    },
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data || [];
    },
  });

  // Join project room for real-time updates
  useEffect(() => {
    if (task?.projectId) {
      joinProject(task.projectId);
      return () => {
        leaveProject(task.projectId);
      };
    }
  }, [task?.projectId, joinProject, leaveProject]);

  // Listen for real-time task updates
  useEffect(() => {
    const unsubscribeUpdate = onTaskUpdated((updatedTask) => {
      if (updatedTask.id === id) {
        queryClient.setQueryData(['task', id], (old: Task | undefined) => {
          if (!old) return old;
          return { ...old, ...updatedTask };
        });
      }
    });

    const unsubscribeDelete = onTaskDeleted((deletedTask) => {
      if (deletedTask.id === id) {
        navigate('/tasks');
      }
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [id, onTaskUpdated, onTaskDeleted, queryClient, navigate]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const res = await api.patch(`/tasks/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/tasks');
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      // TODO: Implement comments API
      console.log('Adding comment:', content);
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', id] });
    },
  });

  useEffect(() => {
    if (task) {
      setEditForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
      });
    }
  }, [task]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Task not found</h3>
        <button
          onClick={() => navigate('/tasks')}
          className="mt-4 text-indigo-600 hover:text-indigo-700"
        >
          Go back to tasks
        </button>
      </div>
    );
  }

  const currentStatus = statusOptions.find((s) => s.value === task.status);
  const currentPriority = priorityOptions.find((p) => p.value === task.priority);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tasks
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this task?')) {
                deleteMutation.mutate();
              }
            }}
            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Task Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateMutation.mutate(editForm)}
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                  {task.aiGenerated && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      AI Generated
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-gray-600 mt-4 whitespace-pre-wrap">{task.description}</p>
                )}
              </>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments
            </h2>

            <div className="space-y-4">
              {/* Comment Input */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <button
                  onClick={() => commentMutation.mutate(newComment)}
                  disabled={!newComment.trim() || commentMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Comments List */}
              {comments && comments.length > 0 ? (
                <div className="space-y-4 mt-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm">
                        {comment.author?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{comment.author?.name || 'Unknown'}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Task Properties */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Properties</h3>
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {currentStatus && (
                      <>
                        <currentStatus.icon className={`w-4 h-4 ${currentStatus.color}`} />
                        <span>{currentStatus.label}</span>
                      </>
                    )}
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => {
                            updateMutation.mutate({ status: status.value });
                            setShowStatusDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                        >
                          <status.icon className={`w-4 h-4 ${status.color}`} />
                          <span>{status.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                <div className="relative">
                  <button
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                    className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {currentPriority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${currentPriority.color}`}>
                        {currentPriority.label}
                      </span>
                    )}
                  </button>
                  {showPriorityDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {priorityOptions.map((priority) => (
                        <button
                          key={priority.value}
                          onClick={() => {
                            updateMutation.mutate({ priority: priority.value });
                            setShowPriorityDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                        >
                          <span className={`px-2 py-0.5 rounded-full text-xs ${priority.color}`}>
                            {priority.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Assignee</label>
                <select
                  value={task.assigneeId || ''}
                  onChange={(e) => updateMutation.mutate({ assigneeId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateMutation.mutate({ dueDate: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estimated Hours</label>
                <input
                  type="number"
                  value={task.estimatedHours || ''}
                  onChange={(e) => updateMutation.mutate({ estimatedHours: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Created {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Updated {format(new Date(task.updatedAt), 'MMM d, yyyy')}</span>
              </div>
              {task.creator && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Created by {task.creator.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
